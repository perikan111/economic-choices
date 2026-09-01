import { describe, expect, test } from "vitest";
import { breadPriceScenario } from "@/content/scenarios";
import { playThrough } from "../helpers";

describe("パンの値段を下げろ！ 通しプレイ", () => {
  test.each([
    ["財政危機", ["subsidy", "rationing", "emergency-subsidy"], "fiscal-crisis"],
    ["供給崩壊", ["price-cap", "rationing", "observe"], "shortage-collapse"],
    ["闇市場都市", ["deregulate", "rationing", "expand-rationing"], "black-market-city"],
    ["軟着陸", ["subsidy", "targeted-support", "stabilize-imports"], "soft-landing"],
    ["均衡", ["deregulate", "wait-second", "observe"], "muddle-through"],
  ])("%sエンディングへ到達する", (_name, choices, endingId) => {
    const state = playThrough(breadPriceScenario, choices as string[]);
    expect(state.cursor).toMatchObject({ phase: "ending", endingId });
    expect(state.reachedEndings).toContain(endingId);
  });
});
