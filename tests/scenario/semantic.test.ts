import { describe, expect, test } from "vitest";
import { breadPriceScenario } from "@/content/scenarios";
import {
  advance,
  choose,
  createInitialState,
  evaluateCondition,
  getView,
  type Choice,
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
  choiceStates: Map<string, GameState[]>;
  sceneStates: Map<string, GameState[]>;
}

interface NumberRange {
  min: number;
  max: number;
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

function conditionReferencesParam(condition: Condition, parameterId: string): boolean {
  if ("param" in condition) return condition.param === parameterId;
  if ("all" in condition) return condition.all.some((item) => conditionReferencesParam(item, parameterId));
  if ("any" in condition) return condition.any.some((item) => conditionReferencesParam(item, parameterId));
  if ("not" in condition) return conditionReferencesParam(condition.not, parameterId);
  return false;
}

function getInformalChoice(choiceId: string): Choice {
  const scene = breadPriceScenario.scenes.find(({ id }) => id === "informal-decision");
  if (!scene || scene.next.type !== "choices") throw new Error("informal-decisionのchoicesが見つかりません。");
  const choice = scene.next.choices.find(({ id }) => id === choiceId);
  if (!choice) throw new Error(`choice ${choiceId} が見つかりません。`);
  return choice;
}

function parameterRange(states: GameState[], parameterId: string): NumberRange {
  const values = states.map((state) => state.parameters[parameterId]);
  if (values.length === 0 || values.some((value) => value === undefined)) {
    throw new Error(`${parameterId}のrangeを算出できません。`);
  }
  return { min: Math.min(...values), max: Math.max(...values) };
}

function correlation(states: GameState[], leftId: string, rightId: string): number {
  const left = states.map((state) => state.parameters[leftId]);
  const right = states.map((state) => state.parameters[rightId]);
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;

  for (let index = 0; index < states.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    covariance += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }

  return Number((covariance / Math.sqrt(leftVariance * rightVariance)).toFixed(3));
}

function enumerateScenario(): ScenarioAudit {
  const completed: GameState[] = [];
  const conditionalLineIds = new Set<string>();
  const choiceCounts: number[] = [];
  const choiceStates = new Map<string, GameState[]>();
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
        choiceStates.set(choice.id, [...(choiceStates.get(choice.id) ?? []), state]);
        pending.push({ state: choose(breadPriceScenario, state, choice.id), steps: steps + 1 });
      }
    } else {
      pending.push({ state: advance(breadPriceScenario, state), steps: steps + 1 });
    }
  }

  return { completed, conditionalLineIds, choiceCounts, choiceStates, sceneStates };
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
const INFORMAL_CHOICE_IDS = [
  "informal-crackdown",
  "informal-register",
  "informal-tolerate",
  "informal-relax-price",
] as const;

function completedAfterChoice(choiceId: string): GameState[] {
  return AUDIT.completed.filter((state) =>
    state.choiceHistory.some((entry) => entry.choiceId === choiceId),
  );
}

function endingStates(endingId: string): GameState[] {
  return AUDIT.completed.filter(
    (state) => state.cursor.phase === "ending" && state.cursor.endingId === endingId,
  );
}

function visibleLineIds(state: GameState, lines: ConditionalLine[]): string[] {
  return lines
    .filter((line) => isVisible(state, line))
    .map((line) => line.id)
    .filter((id): id is string => Boolean(id));
}

function visibleSceneLineIds(state: GameState, sceneId: string): string[] {
  const scene = breadPriceScenario.scenes.find(({ id }) => id === sceneId);
  if (!scene) throw new Error(`scene ${sceneId} が見つかりません。`);
  return visibleLineIds(state, scene.lines);
}

function visibleEndingLineIds(state: GameState, endingId: string): string[] {
  const ending = breadPriceScenario.endings.find(({ id }) => id === endingId);
  if (!ending) throw new Error(`ending ${endingId} が見つかりません。`);
  return visibleLineIds(state, ending.lines);
}

function balanceReport() {
  const crackdownStates = completedAfterChoice("informal-crackdown");
  const crackdownMixedLedger = crackdownStates.filter(
    (state) => state.cursor.phase === "ending" && state.cursor.endingId === "mixed-ledger",
  ).length;

  return {
    totalRoutes: AUDIT.completed.length,
    endingCounts: Object.fromEntries(
      breadPriceScenario.endings.map((ending) => [
        ending.id,
        AUDIT.completed.filter(
          (state) => state.cursor.phase === "ending" && state.cursor.endingId === ending.id,
        ).length,
      ]),
    ),
    informalChoices: Object.fromEntries(
      INFORMAL_CHOICE_IDS.map((choiceId) => {
        const states = completedAfterChoice(choiceId);
        return [choiceId, {
          routes: states.length,
          foodAccess: parameterRange(states, "foodAccess"),
          marketRisk: parameterRange(states, "marketRisk"),
          informalMarket: parameterRange(states, "informalMarket"),
        }];
      }),
    ),
    overall: {
      foodAccess: parameterRange(AUDIT.completed, "foodAccess"),
      marketRisk: parameterRange(AUDIT.completed, "marketRisk"),
      informalMarket: parameterRange(AUDIT.completed, "informalMarket"),
    },
    informalMarketRiskCorrelation: correlation(AUDIT.completed, "informalMarket", "marketRisk"),
    crackdownMixedLedger: {
      routes: crackdownStates.length,
      mixedLedger: crackdownMixedLedger,
      ratio: Number((crackdownMixedLedger / crackdownStates.length).toFixed(3)),
    },
  };
}

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

  test("two-marketsはmarketRisk 28を境に秩序と高リスクの本文を出し分ける", () => {
    const ending = breadPriceScenario.endings.find(({ id }) => id === "two-markets");
    const orderedLine = ending?.lines.find(({ id }) => id === "tm-07-ordered");
    const riskyLine = ending?.lines.find(({ id }) => id === "tm-07-risky");
    if (!orderedLine || !riskyLine) throw new Error("two-marketsのmarketRisk分岐が見つかりません。");

    for (const state of AUDIT.completed.filter(
      ({ cursor }) => cursor.phase === "ending" && cursor.endingId === "two-markets",
    )) {
      expect(isVisible(state, orderedLine)).toBe(state.parameters.marketRisk < 28);
      expect(isVisible(state, riskyLine)).toBe(state.parameters.marketRisk >= 28);
      expect(isVisible(state, orderedLine)).not.toBe(isVisible(state, riskyLine));
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

  test("H8-1: informal-crackdown直後は全到達状態でmarketRiskが低下する", () => {
    const beforeStates = AUDIT.choiceStates.get("informal-crackdown") ?? [];
    expect(beforeStates.length).toBeGreaterThan(0);

    for (const before of beforeStates) {
      const after = choose(breadPriceScenario, before, "informal-crackdown");
      expect(after.parameters.marketRisk).toBeLessThan(before.parameters.marketRisk);
    }
  });

  test("H8-2: informal-registerとinformal-tolerate直後はfoodAccessが上昇する", () => {
    for (const choiceId of ["informal-register", "informal-tolerate"]) {
      const beforeStates = AUDIT.choiceStates.get(choiceId) ?? [];
      expect(beforeStates.length).toBeGreaterThan(0);
      for (const before of beforeStates) {
        const after = choose(breadPriceScenario, before, choiceId);
        expect(after.parameters.foodAccess).toBeGreaterThan(before.parameters.foodAccess);
      }
    }
  });

  test("H8-3: informal-registerは市場規模を増やしmarketRiskを下げる", () => {
    const beforeStates = AUDIT.choiceStates.get("informal-register") ?? [];
    expect(beforeStates.length).toBeGreaterThan(0);

    for (const before of beforeStates) {
      const after = choose(breadPriceScenario, before, "informal-register");
      expect(after.parameters.informalMarket).toBeGreaterThan(before.parameters.informalMarket);
      expect(after.parameters.marketRisk).toBeLessThan(before.parameters.marketRisk);
    }
  });

  test("H8-4: marketRiskをendingと相互排他的な2本以上のconditional lineで参照する", () => {
    const endingReferences = breadPriceScenario.endings.filter(
      ({ condition }) => condition && conditionReferencesParam(condition, "marketRisk"),
    );
    const lineReferences = [
      ...breadPriceScenario.scenes.flatMap((scene) => scene.lines),
      ...breadPriceScenario.endings.flatMap((ending) => ending.lines),
    ].filter(({ condition }) => condition && conditionReferencesParam(condition, "marketRisk"));

    expect(endingReferences.length).toBeGreaterThanOrEqual(1);
    expect(lineReferences.length).toBeGreaterThanOrEqual(2);
  });

  test("H8-7: illicitGoodsAppearedは未登録の黙認経路だけでtrueになる", () => {
    for (const state of AUDIT.completed.filter(({ flags }) => flags.illicitGoodsAppeared)) {
      expect(state.flags.informalTolerated).toBe(true);
      expect(state.flags.informalRegistered).toBe(false);
    }

    for (const state of completedAfterChoice("informal-register")) {
      expect(state.flags.illicitGoodsAppeared).toBe(false);
    }
  });

  test("H8-8: 非公式市場を直接扱う全choiceにbudgetコストがある", () => {
    // informal-relax-priceは既存effectsを変えず、価格政策へ戻る別カテゴリとして扱う。
    for (const choiceId of ["informal-crackdown", "informal-register", "informal-tolerate"]) {
      const budgetEffect = getInformalChoice(choiceId).effects?.find(
        (effect) => "param" in effect && effect.param === "budget",
      );
      expect(budgetEffect).toMatchObject({ param: "budget", op: "add" });
      if (!budgetEffect || !("param" in budgetEffect)) throw new Error("budget effectが見つかりません。");
      expect(budgetEffect.value).toBeLessThan(0);
    }
  });

  test("H8-10: 非公式市場への執行3choiceのpopularity変化は絶対値3以下", () => {
    // informal-relax-priceは既存の政策撤回コスト（popularity -11）を維持する。
    for (const choiceId of ["informal-crackdown", "informal-register", "informal-tolerate"]) {
      const popularityEffects = getInformalChoice(choiceId).effects?.filter(
        (effect) => "param" in effect && effect.param === "popularity",
      ) ?? [];
      const delta = popularityEffects.reduce(
        (total, effect) => total + ("param" in effect ? effect.value : 0),
        0,
      );
      expect(Math.abs(delta)).toBeLessThanOrEqual(3);
    }
  });

  test("H8-9: 経路数や分布を固定せず全8 endingsの到達可能性を確認する", () => {
    const endingCounts = Object.fromEntries(
      breadPriceScenario.endings.map((ending) => [
        ending.id,
        AUDIT.completed.filter(
          (state) => state.cursor.phase === "ending" && state.cursor.endingId === ending.id,
        ).length,
      ]),
    );

    expect(breadPriceScenario.endings).toHaveLength(8);
    expect(AUDIT.completed.length).toBeGreaterThan(0);
    expect(Object.values(endingCounts).every((count) => count > 0)).toBe(true);
  });

  test("policy-driftとd3-nothing経由endingの到達性を監査する", () => {
    const policyDrift = AUDIT.completed.filter(
      (state) => state.cursor.phase === "ending" && state.cursor.endingId === "policy-drift",
    );
    const nothingStates = AUDIT.completed.filter((state) =>
      state.choiceHistory.some(({ choiceId }) => choiceId === "d3-nothing"),
    );
    expect(policyDrift.length).toBeGreaterThan(0);
    expect(nothingStates.length).toBeGreaterThan(0);
  });

  test("H8-5/H8-6を含む全経路バランス値を算出するが分布は固定しない", () => {
    const report = balanceReport();
    expect(report.totalRoutes).toBe(AUDIT.completed.length);
    expect(report.overall.marketRisk.max - report.overall.marketRisk.min).toBeGreaterThan(0);
    expect(Number.isFinite(report.informalMarketRiskCorrelation)).toBe(true);
    expect(report.crackdownMixedLedger.ratio).toBeGreaterThanOrEqual(0);
    expect(report.crackdownMixedLedger.ratio).toBeLessThanOrEqual(1);
    console.info("bread-price balance report", JSON.stringify(report));
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

  test("偽造整理券の摘発成果は購入量制限を実施した経路だけで表示する", () => {
    const states = AUDIT.sceneStates.get("informal-crackdown-after") ?? [];
    expect(states.length).toBeGreaterThan(0);

    for (const state of states) {
      const visible = visibleSceneLineIds(state, "informal-crackdown-after");
      expect(visible).toContain("ica-02");
      expect(visible.includes("ica-02-ration")).toBe(state.flags.everRationing);
    }

    expect(states.some((state) => state.flags.everRationing)).toBe(true);
    expect(states.some((state) => !state.flags.everRationing)).toBe(true);
  });

  test("order-without-breadの偽造整理券も購入量制限の履歴に一致する", () => {
    const states = endingStates("order-without-bread");
    expect(states.length).toBeGreaterThan(0);

    for (const state of states) {
      const visible = visibleEndingLineIds(state, "order-without-bread");
      expect(visible).toContain("owb-02");
      expect(visible.includes("owb-02-ration")).toBe(state.flags.everRationing);
    }

    expect(states.some((state) => state.flags.everRationing)).toBe(true);
    expect(states.some((state) => !state.flags.everRationing)).toBe(true);
  });

  test("摘発成果の無条件本文は購入量制限に依存する用語を使わない", () => {
    const lines = [
      ...(breadPriceScenario.scenes.find(({ id }) => id === "informal-crackdown-after")?.lines ?? []),
      ...(breadPriceScenario.endings.find(({ id }) => id === "order-without-bread")?.lines ?? []),
    ];
    const unconditional = lines.filter((line) => !line.condition);

    expect(unconditional.length).toBeGreaterThan(0);
    for (const line of unconditional) {
      expect(line.text).not.toContain("整理券");
      expect(line.text).not.toContain("支給券");
    }
  });

  test("m6-capの値札は固定値ではなく到達時のpriceを表示する", () => {
    const states = AUDIT.sceneStates.get("m6-cap") ?? [];
    expect(states.length).toBeGreaterThan(0);

    const observed = new Set<number>();
    for (const state of states) {
      const view = getView(breadPriceScenario, state);
      if (!view.text.startsWith("六か月後。条例は生きている")) continue;
      observed.add(state.parameters.price);
      expect(view.text).toContain(`${state.parameters.price} 円`);
      expect(view.text).not.toContain("百六十円");
    }

    expect(observed.size).toBeGreaterThan(1);
  });

  test("for-those-who-needは購入量制限が残る経路でだけ上限を説明する", () => {
    const states = endingStates("for-those-who-need");
    expect(states.length).toBeGreaterThan(0);

    for (const state of states) {
      const visible = visibleEndingLineIds(state, "for-those-who-need");
      expect(visible.includes("ftn-06-rationing")).toBe(state.flags.rationingActive);
    }

    expect(states.some((state) => state.flags.rationingActive)).toBe(true);
  });

  test("the-city-paysの山田の台詞は価格上限の有無で排他的に切り替わる", () => {
    const states = endingStates("the-city-pays");
    expect(states.length).toBeGreaterThan(0);

    for (const state of states) {
      const visible = visibleEndingLineIds(state, "the-city-pays");
      const shown = ["tcp-05", "tcp-05-capped"].filter((id) => visible.includes(id));
      expect(shown).toHaveLength(state.flags.subsidyActive ? 1 : 0);
      if (state.flags.subsidyActive) {
        expect(shown[0]).toBe(state.flags.priceCapActive ? "tcp-05-capped" : "tcp-05");
      }
    }

    expect(states.some((state) => state.flags.subsidyActive && state.flags.priceCapActive)).toBe(true);
    expect(states.some((state) => state.flags.subsidyActive && !state.flags.priceCapActive)).toBe(true);
  });

  test("m9-epilogueの生活描写はfoodAccessの三帯からちょうど1本を表示する", () => {
    const states = AUDIT.sceneStates.get("m9-epilogue") ?? [];
    expect(states.length).toBeGreaterThan(0);

    const bands = new Set<string>();
    for (const state of states) {
      const visible = visibleSceneLineIds(state, "m9-epilogue");
      const shown = ["ep-03", "ep-03-mid", "ep-04"].filter((id) => visible.includes(id));
      expect(shown).toHaveLength(1);
      bands.add(shown[0]);
    }

    expect([...bands].sort()).toEqual(["ep-03", "ep-03-mid", "ep-04"]);
  });

  test("price-called-breadへは補助金継続中には到達しない", () => {
    const states = endingStates("price-called-bread");
    expect(states.length).toBeGreaterThan(0);

    for (const state of states) {
      expect(state.flags.subsidyActive).toBe(false);
      expect(state.flags.everDeregulate).toBe(true);
    }
  });

  test("two-marketsはtm-09の問いを解説で即答しない（E10を持たない）", () => {
    const twoMarkets = breadPriceScenario.endings.find(({ id }) => id === "two-markets");
    if (!twoMarkets) throw new Error("two-marketsが見つかりません。");
    const cards = twoMarkets.lines
      .filter((line) => line.speaker === "analyst")
      .map((line) => line.id?.slice(-3).toUpperCase());

    expect(cards).toEqual(["E04", "E11", "E12"]);
    expect(twoMarkets.lines.at(-1)?.id).not.toBe("tm-09");
    expect(twoMarkets.lines.some((line) => line.id === "tm-09")).toBe(true);
  });

  test("Economics解説に内部parameter idを露出しない", () => {
    const analystLines = breadPriceScenario.endings.flatMap((ending) =>
      ending.lines.filter((line) => line.speaker === "analyst"),
    );
    expect(analystLines.length).toBeGreaterThan(0);

    for (const line of analystLines) {
      for (const parameter of breadPriceScenario.parameters) {
        expect(line.text).not.toContain(parameter.id);
      }
    }
  });

  test("endingタイトルに評価語を使わない", () => {
    const titles = Object.fromEntries(breadPriceScenario.endings.map((ending) => [ending.id, ending.title]));
    expect(titles["policy-drift"]).toBe("予定の立たない街");

    for (const title of Object.values(titles)) {
      for (const word of ["迷走", "失敗", "成功", "正解", "誤り"]) {
        expect(title).not.toContain(word);
      }
    }
  });

  test("E11は届出制を最適解として後出し評価しない", () => {
    const e11Lines = breadPriceScenario.endings.flatMap((ending) =>
      ending.lines.filter(({ id }) => id?.endsWith("e11")),
    );
    expect(e11Lines).toHaveLength(2);

    for (const line of e11Lines) {
      expect(line.text).not.toContain("届出や表示は");
      expect(line.text.split("\n")).toHaveLength(4);
    }
  });

  test("自然失効ルートでは失効が描写され、決定を告げる台詞は出ない", () => {
    const expiryScenes = ["d3-nothing-expire-price", "d3-nothing-expire-support"];
    for (const sceneId of expiryScenes) {
      const scene = breadPriceScenario.scenes.find(({ id }) => id === sceneId);
      expect(scene?.lines.length).toBeGreaterThan(0);
      expect(scene?.lines.every((line) => line.speaker === "narrator")).toBe(true);
    }

    const expired = AUDIT.completed.filter((state) =>
      expiryScenes.some((sceneId) => state.visitedScenes.includes(sceneId)),
    );
    const deliberate = AUDIT.completed.filter(
      (state) =>
        state.flags.justEnded &&
        !expiryScenes.some((sceneId) => state.visitedScenes.includes(sceneId)),
    );
    expect(expired.length).toBeGreaterThan(0);
    expect(deliberate.length).toBeGreaterThan(0);

    for (const state of expired) {
      expect(visibleSceneLineIds(state, "d3-results")).not.toContain("dr-03");
    }
    for (const state of deliberate) {
      expect(visibleSceneLineIds(state, "d3-results")).toContain("dr-03");
    }
  });

  test("choice descriptionは結果を断定せず、代償を明示する", () => {
    const findChoice = (sceneId: string, choiceId: string): Choice => {
      const scene = breadPriceScenario.scenes.find(({ id }) => id === sceneId);
      if (!scene || scene.next.type !== "choices") throw new Error(`${sceneId}のchoicesが見つかりません。`);
      const choice = scene.next.choices.find(({ id }) => id === choiceId);
      if (!choice) throw new Error(`choice ${choiceId} が見つかりません。`);
      return choice;
    };

    const rationing = findChoice("decision-2", "d2-rationing");
    expect(rationing.description).toContain("整理券");
    expect(rationing.description).not.toContain("転売");

    const deregulate = findChoice("decision-1", "d1-deregulate");
    expect(deregulate.description).toContain("競争");

    const register = findChoice("informal-decision", "informal-register");
    expect(register.description).toContain("残れない");
  });

  test("山田のexpression付きlineが立ち絵としてviewへ解決される", () => {
    const yamada = breadPriceScenario.characters.find(({ id }) => id === "yamada");
    const expressions = yamada?.expressions;
    if (!expressions) throw new Error("yamadaのexpressionsが未定義です。");

    const seen = new Set<string>();
    for (const states of AUDIT.sceneStates.values()) {
      for (const state of states) {
        const view = getView(breadPriceScenario, state);
        const portrait = view.speaker?.id === "yamada" ? view.speaker.portrait : undefined;
        if (!portrait) continue;

        const expression = portrait.expression ?? "";
        expect(portrait.imageId).toBe(`yamada.${expression}`);
        expect(portrait.logicalPath).toBe(expressions[expression]);
        expect(portrait.logicalPath.startsWith("bread-price/characters/yamada/")).toBe(true);
        seen.add(expression);
      }
    }

    expect(seen.size).toBeGreaterThanOrEqual(4);
    for (const expression of seen) {
      expect(Object.keys(expressions)).toContain(expression);
    }
  });

  test("黒田のexpression付きlineがscene・endingの双方で立ち絵へ解決される", () => {
    const kuroda = breadPriceScenario.characters.find(({ id }) => id === "kuroda");
    const expressions = kuroda?.expressions;
    if (!expressions) throw new Error("kurodaのexpressionsが未定義です。");

    const collect = (state: GameState, seen: Set<string>): void => {
      const view = getView(breadPriceScenario, state);
      const portrait = view.speaker?.id === "kuroda" ? view.speaker.portrait : undefined;
      if (!portrait) return;

      const expression = portrait.expression ?? "";
      expect(portrait.imageId).toBe(`kuroda.${expression}`);
      expect(portrait.logicalPath).toBe(expressions[expression]);
      expect(portrait.logicalPath.startsWith("bread-price/characters/kuroda/")).toBe(true);
      seen.add(expression);
    };

    const inScenes = new Set<string>();
    for (const states of AUDIT.sceneStates.values()) {
      for (const state of states) collect(state, inScenes);
    }

    // 黒田はendingにも登場する（policy-drift / price-called-bread）。
    const inEndings = new Set<string>();
    for (const completed of AUDIT.completed) {
      let state = completed;
      for (let step = 0; step < 60 && state.cursor.phase === "ending" && !state.finished; step += 1) {
        collect(state, inEndings);
        state = advance(breadPriceScenario, state);
      }
    }

    expect(inScenes).toEqual(new Set(["neutral", "concern", "relieved", "serious"]));
    expect(inEndings).toEqual(new Set(["serious"]));
    for (const expression of [...inScenes, ...inEndings]) {
      expect(Object.keys(expressions)).toContain(expression);
    }
  });

  test.each([
    { characterId: "takahashi", label: "高橋玲奈" },
    { characterId: "fujii", label: "藤井慎一" },
  ])("$labelのexpression付きlineが5表情ともGameViewへ解決される", ({ characterId }) => {
    const character = breadPriceScenario.characters.find(({ id }) => id === characterId);
    const expressions = character?.expressions;
    if (!expressions) throw new Error(`${characterId}のexpressionsが未定義です。`);

    const seen = new Set<string>();
    const collect = (state: GameState): void => {
      const view = getView(breadPriceScenario, state);
      const portrait = view.speaker?.id === characterId ? view.speaker.portrait : undefined;
      if (!portrait) return;

      const expression = portrait.expression ?? "";
      expect(portrait.imageId).toBe(`${characterId}.${expression}`);
      expect(portrait.logicalPath).toBe(expressions[expression]);
      expect(portrait.logicalPath.startsWith(`bread-price/characters/${characterId}/`)).toBe(true);
      seen.add(expression);
    };

    for (const states of AUDIT.sceneStates.values()) {
      for (const state of states) collect(state);
    }
    for (const completed of AUDIT.completed) {
      let state = completed;
      for (let step = 0; step < 80 && state.cursor.phase === "ending" && !state.finished; step += 1) {
        collect(state);
        state = advance(breadPriceScenario, state);
      }
    }

    expect(seen).toEqual(new Set(["neutral", "concern", "frustrated", "relieved", "serious"]));
  });
});
