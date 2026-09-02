import { describe, expect, test } from "vitest";
import { breadPriceScenario } from "@/content/scenarios";
import {
  advance,
  choose,
  createInitialState,
  evaluateCondition,
  getView,
  type Condition,
  type GameState,
} from "@/game-core";

interface ConditionalLine {
  id?: string;
  condition?: Condition;
}

interface ScenarioAudit {
  completed: GameState[];
  conditionalLineIds: Set<string>;
  choiceCounts: number[];
  sceneStates: Map<string, GameState[]>;
}

function isVisible(state: GameState, line: ConditionalLine): boolean {
  return !line.condition || evaluateCondition(state, line.condition);
}

function recordConditionalLines(
  state: GameState,
  lines: ConditionalLine[],
  observed: Set<string>,
): void {
  for (const line of lines) {
    if (line.id && line.condition && evaluateCondition(state, line.condition)) observed.add(line.id);
  }
}

function enumerateScenario(): ScenarioAudit {
  const completed: GameState[] = [];
  const conditionalLineIds = new Set<string>();
  const choiceCounts: number[] = [];
  const sceneStates = new Map<string, GameState[]>();
  const pending: Array<{ state: GameState; steps: number }> = [
    { state: createInitialState(breadPriceScenario), steps: 0 },
  ];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) break;
    if (current.steps >= 300) throw new Error("意味監査の全経路列挙が300ステップを超えました。");

    const { state, steps } = current;
    if (state.cursor.phase === "ending") {
      const endingId = state.cursor.endingId;
      const ending = breadPriceScenario.endings.find(({ id }) => id === endingId);
      if (!ending) throw new Error(`ending ${endingId} が見つかりません。`);
      recordConditionalLines(state, ending.lines, conditionalLineIds);
      completed.push(state);
      continue;
    }

    const scene = breadPriceScenario.scenes.find(({ id }) => id === state.currentSceneId);
    if (!scene) throw new Error(`scene ${state.currentSceneId} が見つかりません。`);
    sceneStates.set(scene.id, [...(sceneStates.get(scene.id) ?? []), state]);
    recordConditionalLines(state, scene.lines, conditionalLineIds);

    const view = getView(breadPriceScenario, state);
    if (view.phase === "choice") {
      const enabled = view.choices.filter((choice) => choice.enabled);
      choiceCounts.push(enabled.length);
      for (const choice of enabled) {
        pending.push({ state: choose(breadPriceScenario, state, choice.id), steps: steps + 1 });
      }
    } else {
      pending.push({ state: advance(breadPriceScenario, state), steps: steps + 1 });
    }
  }

  return { completed, conditionalLineIds, choiceCounts, sceneStates };
}

function reachDecision3(choiceIds: string[]): GameState {
  let state = createInitialState(breadPriceScenario);
  let choiceIndex = 0;

  for (let step = 0; step < 300; step += 1) {
    const view = getView(breadPriceScenario, state);
    if (state.currentSceneId === "decision-3" && view.phase === "choice") return state;
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

const AUDIT = enumerateScenario();

describe("bread-price scenario semantic audit", () => {
  test("d3-nothingは期限付き措置を終了するがpolicyChangesを増やさない", () => {
    for (const choices of [
      ["d1-price-cap", "d2-hold", "informal-crackdown"],
      ["d1-subsidy", "d2-hold"],
    ]) {
      const before = reachDecision3(choices);
      const after = choose(breadPriceScenario, before, "d3-nothing");

      expect(after.flags).toMatchObject({
        priceCapActive: false,
        subsidyActive: false,
        rationingActive: false,
        everReversed: true,
        justEnded: true,
      });
      expect(after.parameters.policyChanges).toBe(before.parameters.policyChanges);
    }
  });

  test("d3-nothingの期限切れショックと終了対象なしの効果を分ける", () => {
    const priceBefore = reachDecision3(["d1-price-cap", "d2-hold", "informal-crackdown"]);
    const priceAfter = choose(breadPriceScenario, priceBefore, "d3-nothing");
    expect(priceAfter.parameters).toMatchObject({
      price: priceBefore.parameters.price + 28,
      supply: priceBefore.parameters.supply + 14,
      informalMarket: priceBefore.parameters.informalMarket - 12,
      foodAccess: priceBefore.parameters.foodAccess + 2,
      marketRisk: priceBefore.parameters.marketRisk - 3,
      popularity: priceBefore.parameters.popularity - 12,
      budget: priceBefore.parameters.budget - 3,
    });

    const supportBefore = reachDecision3(["d1-subsidy", "d2-hold"]);
    const supportAfter = choose(breadPriceScenario, supportBefore, "d3-nothing");
    expect(supportAfter.parameters).toMatchObject({
      price: supportBefore.parameters.price + 14,
      supply: supportBefore.parameters.supply + 4,
      informalMarket: Math.max(0, supportBefore.parameters.informalMarket - 7),
      foodAccess: supportBefore.parameters.foodAccess - 3,
      marketRisk: supportBefore.parameters.marketRisk - 2,
      popularity: supportBefore.parameters.popularity - 12,
      budget: supportBefore.parameters.budget - 2,
    });

    const openBefore = reachDecision3(["d1-deregulate", "d2-hold"]);
    const openAfter = choose(breadPriceScenario, openBefore, "d3-nothing");
    expect(openAfter.flags.justEnded).toBe(false);
    expect(openAfter.parameters).toMatchObject({
      popularity: openBefore.parameters.popularity - 5,
      foodAccess: openBefore.parameters.foodAccess - 2,
      informalMarket: openBefore.parameters.informalMarket + 4,
      budget: openBefore.parameters.budget - 3,
    });
  });

  test("Decision 3結果で恒久化と今回の終了を同時に表示しない", () => {
    const resultScene = breadPriceScenario.scenes.find(({ id }) => id === "d3-results");
    const permanentLine = resultScene?.lines.find(({ id }) => id === "dr-02");
    const endedLine = resultScene?.lines.find(({ id }) => id === "dr-03");
    if (!permanentLine || !endedLine) throw new Error("Decision 3結果行が見つかりません。");

    for (const state of AUDIT.completed) {
      expect(isVisible(state, permanentLine) && isVisible(state, endedLine)).toBe(false);
    }
  });

  test("price-called-bread到達経路はすべて規制緩和を経験している", () => {
    const states = AUDIT.completed.filter(
      (state) => state.cursor.phase === "ending" && state.cursor.endingId === "price-called-bread",
    );

    expect(states.length).toBeGreaterThan(0);
    expect(states.every((state) => state.flags.everDeregulate)).toBe(true);
  });

  test("two-marketsとcheap-bread本文は固定160円ではなく最終priceを使う", () => {
    for (const endingId of ["two-markets", "cheap-bread-empty-shelves"]) {
      const ending = breadPriceScenario.endings.find(({ id }) => id === endingId);
      if (!ending) throw new Error(`ending ${endingId} が見つかりません。`);
      const text = ending.lines.map((line) => line.text).join("\n");
      expect(text).not.toContain("百六十円");
      expect(text).toContain("{{param.price}}");
    }
  });

  test("ep-06は補助金状態に応じて普通の相場と補助継続の台詞を出し分ける", () => {
    const scene = breadPriceScenario.scenes.find(({ id }) => id === "m9-epilogue");
    const marketLine = scene?.lines.find(({ id }) => id === "ep-06");
    const subsidyLine = scene?.lines.find(({ id }) => id === "ep-06-subsidy");
    if (!marketLine || !subsidyLine) throw new Error("黒田のエピローグ行が見つかりません。");

    for (const state of AUDIT.completed.filter(({ parameters }) => parameters.supply >= 85)) {
      expect(isVisible(state, marketLine)).toBe(!state.flags.subsidyActive);
      expect(isVisible(state, subsidyLine)).toBe(state.flags.subsidyActive);
    }
  });

  test("m6-commonは大きな転換・非公式市場履歴に応じて導入を出し分ける", () => {
    const scene = breadPriceScenario.scenes.find(({ id }) => id === "m6-common");
    const stableLine = scene?.lines.find(({ id }) => id === "m6n-01");
    const changedLine = scene?.lines.find(({ id }) => id === "m6n-01-changed");
    const states = AUDIT.sceneStates.get("m6-common") ?? [];
    if (!stableLine || !changedLine) throw new Error("m6-common導入行が見つかりません。");

    let sawStable = false;
    let sawChanged = false;
    for (const state of states) {
      const changed = state.flags.everReversed ||
        state.visitedScenes.includes("informal-intro") ||
        state.parameters.policyChanges >= 1;
      expect(isVisible(state, stableLine)).toBe(!changed);
      expect(isVisible(state, changedLine)).toBe(changed);
      sawStable ||= !changed;
      sawChanged ||= changed;
    }
    expect({ sawStable, sawChanged }).toEqual({ sawStable: true, sawChanged: true });
  });

  test("m6-councilとDecision 3の導入は緊急措置の有無に一致する", () => {
    for (const sceneId of ["m6-council", "decision-3"]) {
      const scene = breadPriceScenario.scenes.find(({ id }) => id === sceneId);
      const states = AUDIT.sceneStates.get(sceneId) ?? [];
      if (!scene) throw new Error(`scene ${sceneId} が見つかりません。`);
      const activeLines = scene.lines.filter(({ id }) => id?.endsWith("-active"));
      const openLines = scene.lines.filter(({ id }) => id?.endsWith("-open"));

      expect(activeLines.length).toBeGreaterThan(0);
      expect(openLines.length).toBeGreaterThan(0);
      for (const state of states) {
        const hasEmergencyMeasure = state.flags.priceCapActive ||
          state.flags.subsidyActive ||
          state.flags.rationingActive;
        expect(activeLines.every((line) => isVisible(state, line))).toBe(hasEmergencyMeasure);
        expect(openLines.every((line) => isVisible(state, line))).toBe(!hasEmergencyMeasure);
      }
    }
  });

  test("ending導入は供給量と価格上限状態に一致する", () => {
    const cityPays = breadPriceScenario.endings.find(({ id }) => id === "the-city-pays");
    const twoMarkets = breadPriceScenario.endings.find(({ id }) => id === "two-markets");
    const stockedLine = cityPays?.lines.find(({ id }) => id === "tcp-01-stocked");
    const shortLine = cityPays?.lines.find(({ id }) => id === "tcp-01-short");
    const capLine = twoMarkets?.lines.find(({ id }) => id === "tm-01-cap");
    const marketLine = twoMarkets?.lines.find(({ id }) => id === "tm-01-market");
    if (!stockedLine || !shortLine || !capLine || !marketLine) {
      throw new Error("ending導入行が見つかりません。");
    }

    for (const state of AUDIT.completed) {
      if (state.cursor.phase !== "ending") continue;
      if (state.cursor.endingId === "the-city-pays") {
        expect(isVisible(state, stockedLine)).toBe(state.parameters.supply >= 70);
        expect(isVisible(state, shortLine)).toBe(state.parameters.supply < 70);
      }
      if (state.cursor.endingId === "two-markets") {
        expect(isVisible(state, capLine)).toBe(state.flags.priceCapActive);
        expect(isVisible(state, marketLine)).toBe(!state.flags.priceCapActive);
      }
    }
  });

  test("E10は非公式市場イベントを経験したendingでのみ表示する", () => {
    const e10Lines = breadPriceScenario.endings.flatMap((ending) =>
      ending.lines.filter(({ id }) => id?.endsWith("e10")),
    );
    expect(e10Lines).toHaveLength(2);

    for (const state of AUDIT.completed) {
      const endingId = state.cursor.phase === "ending" ? state.cursor.endingId : undefined;
      const ending = breadPriceScenario.endings.find(({ id }) => id === endingId);
      for (const line of e10Lines.filter((candidate) => ending?.lines.includes(candidate))) {
        expect(isVisible(state, line)).toBe(state.visitedScenes.includes("informal-intro"));
      }
    }
  });

  test("全到達choice状態で選択可能なchoiceが2件以上ある", () => {
    expect(AUDIT.choiceCounts.length).toBeGreaterThan(0);
    expect(Math.min(...AUDIT.choiceCounts)).toBeGreaterThanOrEqual(2);
  });

  test("全98経路で7 endingsすべてへ到達できる", () => {
    const endingCounts = Object.fromEntries(
      breadPriceScenario.endings.map((ending) => [
        ending.id,
        AUDIT.completed.filter(
          (state) => state.cursor.phase === "ending" && state.cursor.endingId === ending.id,
        ).length,
      ]),
    );

    expect(AUDIT.completed).toHaveLength(98);
    expect(endingCounts).toEqual({
      "the-city-pays": 12,
      "policy-drift": 1,
      "two-markets": 14,
      "cheap-bread-empty-shelves": 4,
      "for-those-who-need": 25,
      "price-called-bread": 7,
      "mixed-ledger": 35,
    });
  });

  test("policy-driftとd3-nothing経由endingの分布を監査する", () => {
    const policyDrift = AUDIT.completed.filter(
      (state) => state.cursor.phase === "ending" && state.cursor.endingId === "policy-drift",
    );
    const nothingStates = AUDIT.completed.filter((state) =>
      state.choiceHistory.some(({ choiceId }) => choiceId === "d3-nothing"),
    );
    const nothingCounts = Object.fromEntries(
      breadPriceScenario.endings.map((ending) => [
        ending.id,
        nothingStates.filter(
          (state) => state.cursor.phase === "ending" && state.cursor.endingId === ending.id,
        ).length,
      ]),
    );

    expect(policyDrift).toHaveLength(1);
    expect(nothingStates).toHaveLength(28);
    expect(nothingCounts).toEqual({
      "the-city-pays": 3,
      "policy-drift": 0,
      "two-markets": 4,
      "cheap-bread-empty-shelves": 0,
      "for-those-who-need": 5,
      "price-called-bread": 3,
      "mixed-ledger": 13,
    });
  });

  test("条件付きlineに到達不能なdead codeがない", () => {
    const conditionalLineIds = new Set(
      [
        ...breadPriceScenario.scenes.flatMap((scene) => scene.lines),
        ...breadPriceScenario.endings.flatMap((ending) => ending.lines),
      ]
        .filter((line) => line.condition)
        .map((line) => line.id)
        .filter((id): id is string => Boolean(id)),
    );

    expect([...AUDIT.conditionalLineIds].sort()).toEqual([...conditionalLineIds].sort());
  });
});
