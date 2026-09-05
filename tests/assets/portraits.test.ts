import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { breadPriceScenario } from "@/content/scenarios";

const expressions = ["neutral", "relieved", "frustrated", "concern", "serious"] as const;

interface PortraitSpec {
  characterId: string;
  label: string;
  width: number;
  height: number;
}

const PORTRAITS: PortraitSpec[] = [
  { characterId: "misaki", label: "佐藤美咲", width: 384, height: 1040 },
  { characterId: "yamada", label: "山田浩一", width: 1024, height: 1536 },
  { characterId: "kuroda", label: "黒田誠", width: 360, height: 1008 },
  { characterId: "takahashi", label: "高橋玲奈", width: 320, height: 976 },
  { characterId: "fujii", label: "藤井慎一", width: 1024, height: 1568 },
];

// .character-portrait-slot の最小カラム幅 360px / 最大スロット高 540px。
// 縦横比がこれを超えるとカラム幅が足りず、そのキャラだけ高さが頭打ちになる。
const MAX_SLOT_HEIGHT = 540;
const MIN_COLUMN_WIDTH = 360;

function readPortrait(characterId: string, expression: string): Buffer {
  return readFileSync(
    resolve(process.cwd(), `public/images/bread-price/characters/${characterId}/${characterId}_${expression}.png`),
  );
}

describe.each(PORTRAITS)("$labelの立ち絵", ({ characterId, width, height }) => {
  test.each(expressions)("%sはキャラクター共通キャンバスの透過PNG", (expression) => {
    const png = readPortrait(characterId, expression);

    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(width);
    expect(png.readUInt32BE(20)).toBe(height);
    expect(png[24]).toBe(8);
    expect(png[25]).toBe(6);
  });

  test("5表情のキャンバス寸法が完全に一致する", () => {
    const sizes = expressions.map((expression) => {
      const png = readPortrait(characterId, expression);
      return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
    });

    expect(new Set(sizes).size).toBe(1);
    expect(sizes[0]).toBe(`${width}x${height}`);
  });
});

describe("キャラクター間の立ち絵スケール", () => {
  test("キャンバス寸法が異なっても高さ基準で身長感が揃う", () => {
    const ratios = PORTRAITS.map(({ height, width }) => width / height);

    // 高さ100%・width autoで表示するため、縦横比が違っても身長は揃う。
    // 表示幅だけが変わることを、比率が互いに異なることで確認する。
    expect(new Set(ratios).size).toBe(PORTRAITS.length);
    for (const ratio of ratios) {
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThan(1);
    }
  });

  test("最大スロット高でもカラム幅に収まり高さが頭打ちにならない", () => {
    for (const { characterId, width, height } of PORTRAITS) {
      const requiredWidth = MAX_SLOT_HEIGHT * (width / height);
      expect(`${characterId}:${requiredWidth <= MIN_COLUMN_WIDTH}`).toBe(`${characterId}:true`);
    }
  });
});

describe("シナリオが宣言する立ち絵アセット", () => {
  const withPortraits = breadPriceScenario.characters.filter(({ expressions }) => expressions);

  test("立ち絵を持つ5人が寸法表に登録されている", () => {
    expect(withPortraits.map(({ id }) => id).sort())
      .toEqual(PORTRAITS.map(({ characterId }) => characterId).sort());
  });

  test("宣言された全expressionの画像ファイルがpublic配下に実在する", () => {
    const missing = withPortraits.flatMap((character) =>
      Object.values(character.expressions ?? {})
        .filter((logicalPath) => !existsSync(resolve(process.cwd(), "public/images", logicalPath))),
    );

    expect(missing).toEqual([]);
  });

  test("defaultExpressionとportraitが同じ画像を指す", () => {
    for (const character of withPortraits) {
      const expressions = character.expressions ?? {};
      expect(Object.keys(expressions)).toContain(character.defaultExpression);
      expect(character.portrait).toBe(expressions[character.defaultExpression ?? ""]);
    }
  });
});
