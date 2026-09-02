import { describe, expect, test } from "vitest";
import { breadPriceScenario } from "@/content/scenarios";
import { playThrough } from "../helpers";

const ENDING_IDS = [
  "cheap-bread-empty-shelves",
  "for-those-who-need",
  "mixed-ledger",
  "policy-drift",
  "price-called-bread",
  "the-city-pays",
  "two-markets",
] as const;

interface RouteExpectation {
  name: string;
  choices: string[];
  endingId: (typeof ENDING_IDS)[number];
  parameters: {
    popularity: number;
    budget: number;
    supply: number;
    price: number;
    informalMarket: number;
    foodAccess: number;
    marketRisk: number;
    policyChanges: number;
  };
}

// 設計書 §14 に最終値が明記されている12経路。
const DESIGN_ROUTES: RouteExpectation[] = [
  {
    name: "A-hold-tolerate-permanent",
    choices: ["d1-price-cap", "d2-hold", "informal-tolerate", "d3-permanent"],
    endingId: "two-markets",
    parameters: { popularity: 58, budget: 57, supply: 16, price: 160, informalMarket: 66, foodAccess: 57, marketRisk: 27, policyChanges: 1 },
  },
  {
    name: "A-hold-crackdown-permanent",
    choices: ["d1-price-cap", "d2-hold", "informal-crackdown", "d3-permanent"],
    endingId: "cheap-bread-empty-shelves",
    parameters: { popularity: 53, budget: 48, supply: 18, price: 160, informalMarket: 34, foodAccess: 27, marketRisk: 15, policyChanges: 0 },
  },
  {
    name: "A-ration-tolerate-permanent",
    choices: ["d1-price-cap", "d2-rationing", "informal-tolerate", "d3-permanent"],
    endingId: "two-markets",
    parameters: { popularity: 69, budget: 42, supply: 15, price: 160, informalMarket: 78, foodAccess: 62, marketRisk: 29, policyChanges: 2 },
  },
  {
    name: "A-ration-relax-phaseout",
    choices: ["d1-price-cap", "d2-rationing", "informal-relax-price", "d3-phase-out"],
    endingId: "policy-drift",
    parameters: { popularity: 43, budget: 64, supply: 75, price: 250, informalMarket: 16, foodAccess: 62, marketRisk: 9, policyChanges: 3 },
  },
  {
    name: "A-relax-monitor",
    choices: ["d1-price-cap", "d2-relax-cap", "d3-monitor"],
    endingId: "mixed-ledger",
    parameters: { popularity: 47, budget: 82, supply: 68, price: 195, informalMarket: 13, foodAccess: 60, marketRisk: 8, policyChanges: 1 },
  },
  {
    name: "B-subsidy-permanent",
    choices: ["d1-subsidy", "d2-subsidy", "d3-permanent"],
    endingId: "the-city-pays",
    parameters: { popularity: 64, budget: 0, supply: 96, price: 175, informalMarket: 8, foodAccess: 79, marketRisk: 12, policyChanges: 0 },
  },
  {
    name: "B-hold-phaseout",
    choices: ["d1-subsidy", "d2-hold", "d3-phase-out"],
    endingId: "price-called-bread",
    parameters: { popularity: 40, budget: 23, supply: 108, price: 235, informalMarket: 0, foodAccess: 77, marketRisk: 5, policyChanges: 1 },
  },
  {
    name: "C-hold-monitor",
    choices: ["d1-deregulate", "d2-hold", "d3-monitor"],
    endingId: "price-called-bread",
    parameters: { popularity: 39, budget: 88, supply: 106, price: 165, informalMarket: 2, foodAccess: 78, marketRisk: 12, policyChanges: 0 },
  },
  {
    name: "C-targeted-targeted",
    choices: ["d1-deregulate", "d2-targeted", "d3-targeted-permanent"],
    endingId: "for-those-who-need",
    parameters: { popularity: 43, budget: 53, supply: 116, price: 195, informalMarket: 0, foodAccess: 93, marketRisk: 12, policyChanges: 1 },
  },
  {
    name: "C-ration-nothing",
    choices: ["d1-deregulate", "d2-rationing", "d3-nothing"],
    endingId: "mixed-ledger",
    parameters: { popularity: 44, budget: 75, supply: 89, price: 180, informalMarket: 35, foodAccess: 73, marketRisk: 19, policyChanges: 1 },
  },
  {
    name: "D-hold-targeted",
    choices: ["d1-targeted", "d2-hold", "d3-targeted-permanent"],
    endingId: "for-those-who-need",
    parameters: { popularity: 41, budget: 50, supply: 83, price: 245, informalMarket: 0, foodAccess: 77, marketRisk: 7, policyChanges: 1 },
  },
  {
    name: "D-cap-phaseout",
    choices: ["d1-targeted", "d2-price-cap", "d3-phase-out"],
    endingId: "for-those-who-need",
    parameters: { popularity: 50, budget: 55, supply: 59, price: 205, informalMarket: 19, foodAccess: 65, marketRisk: 9, policyChanges: 2 },
  },
];

// §14 の表は12経路のみを掲載しているため、全19経路の機械確認用に7経路を補う。
const ADDITIONAL_ROUTES: RouteExpectation[] = [
  {
    name: "A-subsidy-tolerate-phaseout",
    choices: ["d1-price-cap", "d2-subsidy", "informal-tolerate", "d3-phase-out"],
    endingId: "mixed-ledger",
    parameters: { popularity: 54, budget: 46, supply: 56, price: 180, informalMarket: 42, foodAccess: 71, marketRisk: 20, policyChanges: 2 },
  },
  {
    name: "A-targeted-crackdown-targeted",
    choices: ["d1-price-cap", "d2-targeted", "informal-crackdown", "d3-targeted-permanent"],
    endingId: "mixed-ledger",
    parameters: { popularity: 53, budget: 33, supply: 38, price: 180, informalMarket: 16, foodAccess: 46, marketRisk: 10, policyChanges: 1 },
  },
  {
    name: "A-targeted-tolerate-permanent",
    choices: ["d1-price-cap", "d2-targeted", "informal-tolerate", "d3-permanent"],
    endingId: "two-markets",
    parameters: { popularity: 66, budget: 37, supply: 18, price: 160, informalMarket: 66, foodAccess: 67, marketRisk: 27, policyChanges: 1 },
  },
  {
    name: "B-cap-permanent",
    choices: ["d1-subsidy", "d2-price-cap", "d3-permanent"],
    endingId: "the-city-pays",
    parameters: { popularity: 70, budget: 13, supply: 46, price: 165, informalMarket: 43, foodAccess: 59, marketRisk: 16, policyChanges: 1 },
  },
  {
    name: "B-targeted-phaseout",
    choices: ["d1-subsidy", "d2-targeted", "d3-phase-out"],
    endingId: "the-city-pays",
    parameters: { popularity: 48, budget: 3, supply: 110, price: 235, informalMarket: 0, foodAccess: 87, marketRisk: 5, policyChanges: 1 },
  },
  {
    name: "C-subsidy-phaseout",
    choices: ["d1-deregulate", "d2-subsidy", "d3-phase-out"],
    endingId: "price-called-bread",
    parameters: { popularity: 34, budget: 43, supply: 120, price: 210, informalMarket: 0, foodAccess: 86, marketRisk: 10, policyChanges: 1 },
  },
  {
    name: "D-ration-phaseout",
    choices: ["d1-targeted", "d2-rationing", "d3-phase-out"],
    endingId: "for-those-who-need",
    parameters: { popularity: 46, budget: 47, supply: 80, price: 270, informalMarket: 13, foodAccess: 75, marketRisk: 9, policyChanges: 2 },
  },
];

const ROUTES = [...DESIGN_ROUTES, ...ADDITIONAL_ROUTES];

describe("パンの値段を下げろ！ 本番シナリオ通しプレイ", () => {
  test.each(ROUTES)("$name の最終状態が設計値と一致する", ({ choices, endingId, parameters }) => {
    const state = playThrough(breadPriceScenario, choices);

    expect(state.cursor).toMatchObject({ phase: "ending", endingId });
    expect(state.reachedEndings).toContain(endingId);
    expect(state.parameters).toEqual(parameters);
  });

  test("代表19経路で7種類すべてのエンディングへ到達できる", () => {
    const reached = new Set(
      ROUTES.map(({ choices }) => {
        const state = playThrough(breadPriceScenario, choices);
        if (state.cursor.phase !== "ending") throw new Error("エンディングへ到達していません。");
        return state.cursor.endingId;
      }),
    );

    expect([...reached].sort()).toEqual([...ENDING_IDS].sort());
  });

  test("限定的黙認は非公式市場とfoodAccessを伸ばし、線引き不足で違法商品フラグが立つ", () => {
    const state = playThrough(breadPriceScenario, DESIGN_ROUTES[0].choices);

    expect(state.parameters).toMatchObject({ price: 160, supply: 16, informalMarket: 66, foodAccess: 57, marketRisk: 27 });
    expect(state.flags).toMatchObject({ informalTolerated: true, crackdownActive: false, illicitGoodsAppeared: true });
  });

  test("摘発は非公式市場とmarketRiskを抑える一方、foodAccessも低下させる", () => {
    const state = playThrough(breadPriceScenario, DESIGN_ROUTES[1].choices);

    expect(state.parameters).toMatchObject({ price: 160, supply: 18, informalMarket: 34, foodAccess: 27, marketRisk: 15 });
    expect(state.flags).toMatchObject({ informalTolerated: false, crackdownActive: true, illicitGoodsAppeared: false });
  });

  test("政策変更が3回に達した経路はpolicy-driftへ分岐する", () => {
    const state = playThrough(breadPriceScenario, DESIGN_ROUTES[3].choices);

    expect(state.parameters.policyChanges).toBe(3);
    expect(state.cursor).toMatchObject({ phase: "ending", endingId: "policy-drift" });
  });

  test("個別条件に一致しない経路はfallback endingへ到達する", () => {
    const state = playThrough(breadPriceScenario, DESIGN_ROUTES[4].choices);

    expect(state.cursor).toMatchObject({ phase: "ending", endingId: "mixed-ledger" });
  });
});
