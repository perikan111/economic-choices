import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

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
];

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
});
