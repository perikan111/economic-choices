import { describe, expect, test } from "vitest";
import { breadPriceScenario } from "@/content/scenarios";
import {
  advance,
  choose,
  createInitialState,
  getView,
  type GameState,
} from "@/game-core";
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
    parameters: { popularity: 58, budget: 57, supply: 16, price: 160, informalMarket: 66, foodAccess: 57, marketRisk: 27, policyChanges: 0 },
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
    parameters: { popularity: 69, budget: 42, supply: 15, price: 160, informalMarket: 78, foodAccess: 62, marketRisk: 29, policyChanges: 1 },
  },
  {
    name: "A-ration-relax-phaseout",
    choices: ["d1-price-cap", "d2-rationing", "informal-relax-price", "d3-phase-out-support"],
    endingId: "policy-drift",
    parameters: { popularity: 43, budget: 68, supply: 59, price: 230, informalMarket: 24, foodAccess: 57, marketRisk: 11, policyChanges: 3 },
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
    choices: ["d1-subsidy", "d2-hold", "d3-phase-out-support"],
    endingId: "mixed-ledger",
    parameters: { popularity: 40, budget: 27, supply: 92, price: 215, informalMarket: 0, foodAccess: 72, marketRisk: 7, policyChanges: 1 },
  },
  {
    name: "C-hold-monitor",
    choices: ["d1-deregulate", "d2-hold", "d3-monitor"],
    endingId: "price-called-bread",
    parameters: { popularity: 39, budget: 88, supply: 106, price: 165, informalMarket: 2, foodAccess: 78, marketRisk: 12, policyChanges: 0 },
  },
  {
    name: "C-targeted-targeted",
    choices: ["d1-deregulate", "d2-targeted", "d3-support-permanent"],
    endingId: "for-those-who-need",
    parameters: { popularity: 47, budget: 58, supply: 102, price: 175, informalMarket: 2, foodAccess: 89, marketRisk: 14, policyChanges: 0 },
  },
  {
    name: "C-ration-nothing",
    choices: ["d1-deregulate", "d2-rationing", "d3-nothing"],
    endingId: "price-called-bread",
    parameters: { popularity: 37, budget: 76, supply: 93, price: 194, informalMarket: 24, foodAccess: 72, marketRisk: 17, policyChanges: 1 },
  },
  {
    name: "D-hold-targeted",
    choices: ["d1-targeted", "d2-hold", "d3-support-permanent"],
    endingId: "for-those-who-need",
    parameters: { popularity: 45, budget: 55, supply: 69, price: 225, informalMarket: 2, foodAccess: 73, marketRisk: 9, policyChanges: 0 },
  },
  {
    name: "D-cap-phaseout",
    choices: ["d1-targeted", "d2-price-cap", "d3-phase-out-price"],
    endingId: "for-those-who-need",
    parameters: { popularity: 50, budget: 55, supply: 59, price: 205, informalMarket: 19, foodAccess: 65, marketRisk: 9, policyChanges: 2 },
  },
];

// §14 の表は12経路のみを掲載しているため、全19経路の機械確認用に7経路を補う。
const ADDITIONAL_ROUTES: RouteExpectation[] = [
  {
    name: "A-subsidy-tolerate-phaseout",
    choices: ["d1-price-cap", "d2-subsidy", "informal-tolerate", "d3-phase-out-price"],
    endingId: "mixed-ledger",
    parameters: { popularity: 54, budget: 46, supply: 56, price: 180, informalMarket: 42, foodAccess: 71, marketRisk: 20, policyChanges: 1 },
  },
  {
    name: "A-targeted-crackdown-targeted",
    choices: ["d1-price-cap", "d2-targeted", "informal-crackdown", "d3-market-return-with-support"],
    endingId: "mixed-ledger",
    parameters: { popularity: 53, budget: 33, supply: 38, price: 180, informalMarket: 16, foodAccess: 46, marketRisk: 10, policyChanges: 1 },
  },
  {
    name: "A-targeted-tolerate-permanent",
    choices: ["d1-price-cap", "d2-targeted", "informal-tolerate", "d3-permanent"],
    endingId: "two-markets",
    parameters: { popularity: 66, budget: 37, supply: 18, price: 160, informalMarket: 66, foodAccess: 67, marketRisk: 27, policyChanges: 0 },
  },
  {
    name: "B-cap-permanent",
    choices: ["d1-subsidy", "d2-price-cap", "d3-permanent"],
    endingId: "the-city-pays",
    parameters: { popularity: 70, budget: 13, supply: 46, price: 165, informalMarket: 43, foodAccess: 59, marketRisk: 16, policyChanges: 1 },
  },
  {
    name: "B-targeted-phaseout",
    choices: ["d1-subsidy", "d2-targeted", "d3-phase-out-support"],
    endingId: "the-city-pays",
    parameters: { popularity: 48, budget: 7, supply: 94, price: 215, informalMarket: 0, foodAccess: 82, marketRisk: 7, policyChanges: 1 },
  },
  {
    name: "C-subsidy-phaseout",
    choices: ["d1-deregulate", "d2-subsidy", "d3-phase-out-support"],
    endingId: "price-called-bread",
    parameters: { popularity: 34, budget: 47, supply: 116, price: 190, informalMarket: 0, foodAccess: 81, marketRisk: 12, policyChanges: 1 },
  },
  {
    name: "D-ration-phaseout",
    choices: ["d1-targeted", "d2-rationing", "d3-phase-out-support"],
    endingId: "for-those-who-need",
    parameters: { popularity: 46, budget: 51, supply: 64, price: 250, informalMarket: 21, foodAccess: 70, marketRisk: 11, policyChanges: 2 },
  },
];

const ROUTES = [...DESIGN_ROUTES, ...ADDITIONAL_ROUTES];

function reachDecision3(choiceIds: string[]): GameState {
  let state = createInitialState(breadPriceScenario);
  let choiceIndex = 0;

  for (let step = 0; step < 300; step += 1) {
    const view = getView(breadPriceScenario, state);
    if (state.currentSceneId === "decision-3" && view.phase === "choice") {
      if (choiceIndex !== choiceIds.length) throw new Error("Decision 3までに未使用の選択肢があります。");
      return state;
    }
    if (view.phase === "choice") {
      const choiceId = choiceIds[choiceIndex++];
      if (!choiceId) throw new Error("Decision 3までの選択肢が不足しています。");
      state = choose(breadPriceScenario, state, choiceId);
    } else {
      state = advance(breadPriceScenario, state);
    }
  }

  throw new Error("Decision 3へ到達できませんでした。");
}

function enumerateAllPlaythroughs(): { completed: GameState[]; decision3States: GameState[] } {
  const completed: GameState[] = [];
  const decision3States: GameState[] = [];
  const pending: Array<{ state: GameState; steps: number }> = [
    { state: createInitialState(breadPriceScenario), steps: 0 },
  ];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) break;
    if (current.steps >= 300) throw new Error("全経路列挙が300ステップを超えました。");

    const { state, steps } = current;
    if (state.cursor.phase === "ending") {
      completed.push(state);
      continue;
    }

    const view = getView(breadPriceScenario, state);
    if (view.phase === "choice") {
      if (state.currentSceneId === "decision-3") decision3States.push(state);
      for (const choice of view.choices.filter(({ enabled }) => enabled)) {
        pending.push({ state: choose(breadPriceScenario, state, choice.id), steps: steps + 1 });
      }
    } else {
      pending.push({ state: advance(breadPriceScenario, state), steps: steps + 1 });
    }
  }

  return { completed, decision3States };
}

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

  test("市場価格で無支援の状態には、市場回帰ではなく新規限定支援・公表・現状維持を表示する", () => {
    const state = reachDecision3(["d1-deregulate", "d2-hold"]);
    const choiceIds = getView(breadPriceScenario, state).choices.map(({ id }) => id);

    expect(choiceIds).toEqual(["d3-support-new", "d3-monitor", "d3-nothing"]);
    expect(choiceIds).not.toContain("d3-market-return-with-support");
  });

  test("価格上限が有効なら市場価格と限定支援へ切り替える選択肢を表示する", () => {
    const state = reachDecision3(["d1-targeted", "d2-price-cap"]);
    const choiceIds = getView(breadPriceScenario, state).choices.map(({ id }) => id);

    expect(state.flags.priceCapActive).toBe(true);
    expect(choiceIds).toContain("d3-market-return-with-support");
  });

  test("市場価格で限定支援中なら既存支援の恒久化だけを表示し、新規開始は表示しない", () => {
    const state = reachDecision3(["d1-deregulate", "d2-targeted"]);
    const choiceIds = getView(breadPriceScenario, state).choices.map(({ id }) => id);

    expect(state.flags).toMatchObject({
      priceCapActive: false,
      subsidyActive: false,
      rationingActive: false,
      targetedSupportActive: true,
    });
    expect(choiceIds).toContain("d3-support-permanent");
    expect(choiceIds).not.toContain("d3-support-new");
  });

  test("限定支援の恒久化は価格・供給・非公式市場・政策変更回数を変えない", () => {
    const before = reachDecision3(["d1-deregulate", "d2-targeted"]);
    const after = choose(breadPriceScenario, before, "d3-support-permanent");

    expect(after.parameters).toMatchObject({
      price: before.parameters.price,
      supply: before.parameters.supply,
      informalMarket: before.parameters.informalMarket,
      policyChanges: before.parameters.policyChanges,
      budget: before.parameters.budget - 15,
      foodAccess: before.parameters.foodAccess + 5,
      popularity: before.parameters.popularity + 1,
      marketRisk: before.parameters.marketRisk - 1,
    });
    expect(after.flags.permanentized).toBe(true);
  });

  test("市場価格と限定支援への切り替えは既存の価格・配給・補助措置をすべて終了する", () => {
    const before = reachDecision3(["d1-subsidy", "d2-price-cap"]);
    const after = choose(breadPriceScenario, before, "d3-market-return-with-support");

    expect(before.flags).toMatchObject({ priceCapActive: true, subsidyActive: true });
    expect(after.flags).toMatchObject({
      priceCapActive: false,
      rationingActive: false,
      subsidyActive: false,
      targetedSupportActive: true,
      everTargetedSupport: true,
      everReversed: true,
    });
  });

  test("Decision 3の全到達状態で、意味が重複しない3〜4個の選択肢を表示する", () => {
    const { decision3States } = enumerateAllPlaythroughs();

    expect(decision3States.length).toBeGreaterThan(0);
    for (const state of decision3States) {
      const choices = getView(breadPriceScenario, state).choices;
      const choiceIds = choices.map(({ id }) => id);
      expect(choices.every(({ enabled }) => enabled)).toBe(true);
      expect(choiceIds).toHaveLength(new Set(choiceIds).size);
      expect(choiceIds.length).toBeGreaterThanOrEqual(3);
      expect(choiceIds.length).toBeLessThanOrEqual(4);
      expect(choiceIds.includes("d3-phase-out-price") && choiceIds.includes("d3-phase-out-support")).toBe(false);
      expect(choiceIds.includes("d3-support-new") && choiceIds.includes("d3-support-permanent")).toBe(false);
    }
  });

  test("全プレイ経路を列挙して7 endingsとpolicy-driftへの到達を維持する", () => {
    const { completed } = enumerateAllPlaythroughs();
    const reached = new Set(
      completed.map((state) => {
        if (state.cursor.phase !== "ending") throw new Error("エンディングへ到達していません。");
        return state.cursor.endingId;
      }),
    );

    expect(completed).toHaveLength(98);
    expect([...reached].sort()).toEqual([...ENDING_IDS].sort());
    expect(reached).toContain("policy-drift");
  });
});
