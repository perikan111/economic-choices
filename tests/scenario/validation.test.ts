import { describe, expect, test } from "vitest";
import breadPriceRaw from "../../scenarios/bread-price/scenario.json";
import { breadPriceScenario } from "@/content/scenarios";
import { validateScenario, type Choice, type Effect, type Next } from "@/game-core";

function countChoices(next: Next): number {
  switch (next.type) {
    case "choices":
      return next.choices.length + next.choices.reduce((total, choice) => total + countChoices(choice.next), 0);
    case "branch":
      return next.branches.reduce((total, branch) => total + countChoices(branch.then), 0) + countChoices(next.else);
    case "goto":
    case "ending":
    case "resolveEnding":
      return 0;
  }
}

function findChoice(sceneId: string, choiceId: string): Choice {
  const scene = breadPriceScenario.scenes.find(({ id }) => id === sceneId);
  if (!scene || scene.next.type !== "choices") throw new Error(`${sceneId}のchoicesが見つかりません。`);
  const choice = scene.next.choices.find(({ id }) => id === choiceId);
  if (!choice) throw new Error(`${choiceId}が見つかりません。`);
  return choice;
}

function parameterEffects(effects: Effect[] | undefined): Record<string, number> {
  return Object.fromEntries(
    (effects ?? []).filter((effect) => "param" in effect).map((effect) =>
      "param" in effect ? [effect.param, effect.value] : ["", 0],
    ),
  );
}

describe("scenario validation", () => {
  test("bread-priceシナリオの構造と参照が正しい", () => {
    const result = validateScenario(breadPriceRaw);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("本番設計のシーン・選択肢・エンディング数を維持する", () => {
    expect(breadPriceScenario.scenes).toHaveLength(35);
    expect(breadPriceScenario.scenes.reduce((total, scene) => total + countChoices(scene.next), 0)).toBe(22);
    expect(breadPriceScenario.endings).toHaveLength(8);
  });

  test("設計書のline単位と一意なIDを維持する", () => {
    const lines = [
      ...breadPriceScenario.scenes.flatMap((scene) => scene.lines),
      ...breadPriceScenario.endings.flatMap((ending) => ending.lines),
    ];
    const analystLines = lines.filter((line) => line.speaker === "analyst");
    const baseLines = lines.filter((line) => line.speaker !== "analyst");
    const lineIds = lines.map((line) => line.id);
    const speakerCounts = Object.fromEntries(
      ["narrator", "misaki", "fujii", "yamada", "takahashi", "kuroda"].map((speaker) => [
        speaker,
        baseLines.filter((line) => line.speaker === speaker).length,
      ]),
    );

    expect(baseLines).toHaveLength(245);
    expect(analystLines).toHaveLength(31);
    expect(lines).toHaveLength(276);
    expect(speakerCounts).toEqual({ narrator: 77, misaki: 44, fujii: 45, yamada: 32, takahashi: 32, kuroda: 15 });
    expect(baseLines.filter((line) => line.text.includes("{{param."))).toHaveLength(25);
    expect(lineIds.every((id) => id !== undefined)).toBe(true);
    expect(new Set(lineIds).size).toBe(lines.length);
  });

  test("analystはendingのEconomics解説にのみ登場する", () => {
    expect(breadPriceScenario.scenes.flatMap((scene) => scene.lines).some((line) => line.speaker === "analyst")).toBe(false);
    expect(breadPriceScenario.endings.every((ending) => ending.lines.some((line) => line.speaker === "analyst"))).toBe(true);
  });

  test("主要charactersに表示用roleが設定されている", () => {
    const roles = Object.fromEntries(
      breadPriceScenario.characters.map(({ id, role }) => [id, role]),
    );

    expect(roles).toEqual({
      narrator: undefined,
      misaki: "市民代表",
      yamada: "パン屋",
      kuroda: "食品卸",
      takahashi: "市・福祉担当",
      fujii: "市・財政担当",
      analyst: "ECONOMICS",
    });
  });

  test("佐藤美咲のデフォルトと5表情を論理パスで定義する", () => {
    const misaki = breadPriceScenario.characters.find(({ id }) => id === "misaki");
    expect(misaki).toMatchObject({
      portrait: "bread-price/characters/misaki/misaki_neutral.png",
      defaultExpression: "neutral",
      expressions: {
        neutral: "bread-price/characters/misaki/misaki_neutral.png",
        relieved: "bread-price/characters/misaki/misaki_relieved.png",
        frustrated: "bread-price/characters/misaki/misaki_frustrated.png",
        concern: "bread-price/characters/misaki/misaki_concern.png",
        serious: "bread-price/characters/misaki/misaki_serious.png",
      },
    });

    const usedExpressions = new Set([
      ...breadPriceScenario.scenes.flatMap((scene) => scene.lines),
      ...breadPriceScenario.endings.flatMap((ending) => ending.lines),
    ].filter((line) => line.speaker === "misaki").map((line) => line.expression ?? misaki?.defaultExpression));
    expect(usedExpressions).toEqual(new Set(["neutral", "relieved", "frustrated", "concern", "serious"]));
  });

  test("山田浩一のデフォルトと5表情を論理パスで定義する", () => {
    const yamada = breadPriceScenario.characters.find(({ id }) => id === "yamada");
    expect(yamada).toMatchObject({
      portrait: "bread-price/characters/yamada/yamada_neutral.png",
      defaultExpression: "neutral",
      expressions: {
        neutral: "bread-price/characters/yamada/yamada_neutral.png",
        concern: "bread-price/characters/yamada/yamada_concern.png",
        frustrated: "bread-price/characters/yamada/yamada_frustrated.png",
        relieved: "bread-price/characters/yamada/yamada_relieved.png",
        serious: "bread-price/characters/yamada/yamada_serious.png",
      },
    });

    const lines = [
      ...breadPriceScenario.scenes.flatMap((scene) => scene.lines),
      ...breadPriceScenario.endings.flatMap((ending) => ending.lines),
    ].filter((line) => line.speaker === "yamada");

    expect(lines).toHaveLength(32);
    expect(lines.every((line) => line.expression !== undefined)).toBe(true);

    const usedExpressions = new Set(lines.map((line) => line.expression ?? yamada?.defaultExpression));
    expect(usedExpressions).toEqual(new Set(["neutral", "relieved", "frustrated", "concern", "serious"]));

    // 山田は怒鳴る人物ではないため frustrated の使用頻度は低い。
    const frustrated = lines.filter((line) => line.expression === "frustrated");
    expect(frustrated.length).toBeGreaterThan(0);
    expect(frustrated.length).toBeLessThanOrEqual(3);
  });

  test("14種類のEconomics解説を割り当てる（two-marketsのみ3枚）", () => {
    const assignments = Object.fromEntries(
      breadPriceScenario.endings.map((ending) => [
        ending.id,
        ending.lines.filter((line) => line.speaker === "analyst").map((line) => line.id?.slice(-3).toUpperCase()),
      ]),
    );

    expect(assignments).toEqual({
      "the-city-pays": ["E05", "E08", "E02", "E12"],
      "policy-drift": ["E13", "E03", "E08", "E12"],
      "two-markets": ["E04", "E11", "E12"],
      "cheap-bread-empty-shelves": ["E01", "E04", "E10", "E12"],
      "order-without-bread": ["E10", "E11", "E14", "E12"],
      "for-those-who-need": ["E07", "E03", "E08", "E12"],
      "price-called-bread": ["E03", "E06", "E01", "E12"],
      "mixed-ledger": ["E02", "E08", "E09", "E12"],
    });
    expect(new Set(Object.values(assignments).flat()).size).toBe(14);
  });

  test("本番parameter定義とgoodDirectionが設計書どおりである", () => {
    expect(breadPriceScenario.parameters.map((parameter) => parameter.id)).toEqual([
      "popularity",
      "budget",
      "supply",
      "price",
      "informalMarket",
      "foodAccess",
      "marketRisk",
      "policyChanges",
    ]);

    const parameters = Object.fromEntries(breadPriceScenario.parameters.map((parameter) => [parameter.id, parameter]));
    expect(parameters.price.display?.goodDirection).toBe("neutral");
    expect(parameters.informalMarket.display?.goodDirection).toBe("neutral");
    expect(parameters.foodAccess.display?.goodDirection).toBe("up");
    expect(parameters.marketRisk.display?.goodDirection).toBe("down");
    expect(parameters.policyChanges.display?.visible).toBe(false);
    expect(JSON.stringify(breadPriceRaw)).not.toContain("blackMarket");
  });

  test("H-8追加構成とscenario versionを維持する", () => {
    expect(breadPriceScenario.meta.version).toBe("1.1.0");
    expect(breadPriceScenario.initialState.flags).toMatchObject({
      informalRegistered: false,
      illicitGoodsAppeared: false,
    });
    expect(breadPriceScenario.scenes.some(({ id }) => id === "informal-register-after")).toBe(true);
    expect(breadPriceScenario.endings.map(({ id }) => id)).toContain("order-without-bread");
  });

  test("H-8で採用した非公式市場4choiceとrisk調整値を維持する", () => {
    expect(parameterEffects(findChoice("informal-decision", "informal-crackdown").effects)).toEqual({
      informalMarket: -22,
      foodAccess: -10,
      budget: -16,
      marketRisk: -12,
      popularity: -1,
      supply: 4,
    });
    expect(parameterEffects(findChoice("informal-decision", "informal-register").effects)).toEqual({
      informalMarket: 8,
      foodAccess: 12,
      marketRisk: -2,
      budget: -20,
      supply: 2,
      popularity: 0,
      policyChanges: 0,
    });
    expect(parameterEffects(findChoice("informal-decision", "informal-tolerate").effects)).toEqual({
      informalMarket: 12,
      foodAccess: 18,
      marketRisk: 14,
      popularity: 1,
      budget: -4,
      policyChanges: 0,
    });
    expect(parameterEffects(findChoice("informal-decision", "informal-relax-price").effects)).toEqual({
      price: 215,
      supply: 24,
      informalMarket: -20,
      foodAccess: 8,
      popularity: -11,
      marketRisk: -5,
      policyChanges: 1,
    });

    const w3Cap = breadPriceScenario.scenes.find(({ id }) => id === "w3-cap");
    expect(parameterEffects(w3Cap?.onEnter).marketRisk).toBe(8);
    expect(parameterEffects(findChoice("decision-2", "d2-rationing").effects).marketRisk).toBe(3);
    const monitorEffects = parameterEffects(findChoice("decision-3", "d3-monitor").effects);
    expect(monitorEffects.marketRisk).toBe(-5);
    expect(monitorEffects).not.toHaveProperty("informalMarket");
  });

  test("分岐専用router sceneは空のまま維持する", () => {
    for (const sceneId of ["d2-router", "m6-router"]) {
      expect(breadPriceScenario.scenes.find((scene) => scene.id === sceneId)?.lines).toEqual([]);
    }
  });
});
