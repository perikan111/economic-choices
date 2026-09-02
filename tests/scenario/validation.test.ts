import { describe, expect, test } from "vitest";
import breadPriceRaw from "../../scenarios/bread-price/scenario.json";
import { breadPriceScenario } from "@/content/scenarios";
import { validateScenario, type Next } from "@/game-core";

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

describe("scenario validation", () => {
  test("bread-priceシナリオの構造と参照が正しい", () => {
    const result = validateScenario(breadPriceRaw);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("本番設計のシーン・選択肢・エンディング数を維持する", () => {
    expect(breadPriceScenario.scenes).toHaveLength(31);
    expect(breadPriceScenario.scenes.reduce((total, scene) => total + countChoices(scene.next), 0)).toBe(21);
    expect(breadPriceScenario.endings).toHaveLength(7);
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

    expect(baseLines).toHaveLength(210);
    expect(analystLines).toHaveLength(28);
    expect(lines).toHaveLength(238);
    expect(speakerCounts).toEqual({ narrator: 62, misaki: 40, fujii: 39, yamada: 30, takahashi: 25, kuroda: 14 });
    expect(baseLines.filter((line) => line.text.includes("{{param."))).toHaveLength(21);
    expect(lineIds.every((id) => id !== undefined)).toBe(true);
    expect(new Set(lineIds).size).toBe(lines.length);
  });

  test("analystはendingのEconomics解説にのみ登場する", () => {
    expect(breadPriceScenario.scenes.flatMap((scene) => scene.lines).some((line) => line.speaker === "analyst")).toBe(false);
    expect(breadPriceScenario.endings.every((ending) => ending.lines.some((line) => line.speaker === "analyst"))).toBe(true);
  });

  test("13種類のEconomics解説を設計どおり各endingへ4枚ずつ割り当てる", () => {
    const assignments = Object.fromEntries(
      breadPriceScenario.endings.map((ending) => [
        ending.id,
        ending.lines.filter((line) => line.speaker === "analyst").map((line) => line.id?.slice(-3).toUpperCase()),
      ]),
    );

    expect(assignments).toEqual({
      "the-city-pays": ["E05", "E08", "E02", "E12"],
      "policy-drift": ["E13", "E03", "E08", "E12"],
      "two-markets": ["E04", "E10", "E11", "E12"],
      "cheap-bread-empty-shelves": ["E01", "E04", "E10", "E12"],
      "for-those-who-need": ["E07", "E03", "E08", "E12"],
      "price-called-bread": ["E03", "E06", "E01", "E12"],
      "mixed-ledger": ["E02", "E08", "E09", "E12"],
    });
    expect(new Set(Object.values(assignments).flat()).size).toBe(13);
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

  test("分岐専用router sceneは空のまま維持する", () => {
    for (const sceneId of ["d2-router", "m6-router"]) {
      expect(breadPriceScenario.scenes.find((scene) => scene.id === sceneId)?.lines).toEqual([]);
    }
  });
});
