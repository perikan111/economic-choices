import {
  advance,
  choose,
  createInitialState,
  getView,
  type GameState,
  type Scenario,
} from "@/game-core";

export function reachNextChoice(scenario: Scenario, initial: GameState): GameState {
  let state = initial;
  for (let step = 0; step < 100; step += 1) {
    if (state.cursor.phase === "choice" || state.cursor.phase === "ending") return state;
    state = advance(scenario, state);
  }
  throw new Error("選択肢へ到達できませんでした。");
}

export function playThrough(scenario: Scenario, choiceIds: string[]): GameState {
  let state = createInitialState(scenario);
  let choiceIndex = 0;
  for (let step = 0; step < 300; step += 1) {
    if (state.cursor.phase === "ending") return state;
    const view = getView(scenario, state);
    if (view.phase === "choice") {
      const choiceId = choiceIds[choiceIndex++];
      if (!choiceId) throw new Error("通しプレイ用の選択肢が不足しています。");
      state = choose(scenario, state, choiceId);
    } else {
      state = advance(scenario, state);
    }
  }
  throw new Error("エンディングへ到達できませんでした。");
}
