import { describe, expect, test } from "vitest";
import breadPriceRaw from "../../scenarios/bread-price/scenario.json";
import { validateScenario } from "@/game-core";

describe("scenario validation", () => {
  test("bread-priceシナリオの構造と参照が正しい", () => {
    const result = validateScenario(breadPriceRaw);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
