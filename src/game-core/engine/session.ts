import { EngineError } from "../errors";
import type { Scenario } from "../types/scenario";
import type { GameState } from "../types/state";
import { evaluateCondition } from "./conditions";
import { applyEffects } from "./effects";
import { getVisibleLines } from "./lines";
import { getPendingChoices, resolveNext } from "./transition";

export function createInitialState(scenario: Scenario): GameState {
  const startScene = scenario.initialState.startScene;
  const base: GameState = {
    scenarioId: scenario.meta.id,
    scenarioVersion: scenario.meta.version,
    cursor: { phase: "line", sceneId: startScene, lineIndex: 0 },
    currentSceneId: startScene,
    parameters: { ...scenario.initialState.params },
    flags: { ...scenario.initialState.flags },
    visitedScenes: [],
    history: [],
    choiceHistory: [],
    reachedEndings: [],
    lastDeltas: {},
    finished: false,
  };
  return resolveNext(scenario, base, { type: "goto", scene: startScene });
}

export function advance(scenario: Scenario, state: GameState): GameState {
  if (state.finished || state.cursor.phase === "choice") return state;

  if (state.cursor.phase === "ending") {
    const endingId = state.cursor.endingId;
    const ending = scenario.endings.find((candidate) => candidate.id === endingId);
    if (!ending) throw new EngineError(`エンディング "${endingId}" が存在しません。`);
    const lines = getVisibleLines(ending.lines, state);
    if (state.cursor.lineIndex + 1 < lines.length) {
      return { ...state, cursor: { ...state.cursor, lineIndex: state.cursor.lineIndex + 1 } };
    }
    return { ...state, finished: true, lastDeltas: {} };
  }

  const sceneId = state.cursor.sceneId;
  const scene = scenario.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) throw new EngineError(`シーン "${sceneId}" が存在しません。`);
  const lines = getVisibleLines(scene.lines, state);
  if (state.cursor.lineIndex + 1 < lines.length) {
    return { ...state, cursor: { ...state.cursor, lineIndex: state.cursor.lineIndex + 1 } };
  }
  return resolveNext(scenario, { ...state, lastDeltas: {} }, scene.next);
}

export function choose(scenario: Scenario, state: GameState, choiceId: string): GameState {
  if (state.cursor.phase !== "choice") {
    throw new EngineError("現在は選択肢を選べません。");
  }
  const { choices } = getPendingChoices(scenario, state);
  const choice = choices.find((candidate) => candidate.id === choiceId);
  if (!choice) throw new EngineError(`選択肢 "${choiceId}" が存在しません。`);
  if (choice.condition && !evaluateCondition(state, choice.condition)) {
    throw new EngineError(`選択肢 "${choiceId}" は現在選べません。`);
  }

  const stateWithEffects = applyEffects(
    scenario,
    { ...state, lastDeltas: {} },
    choice.effects ?? [],
  );
  const deltas = { ...stateWithEffects.lastDeltas };
  const withHistory: GameState = {
    ...stateWithEffects,
    history: [
      ...stateWithEffects.history,
      { type: "choice", sceneId: state.currentSceneId, choiceId, deltas },
    ],
    choiceHistory: [
      ...stateWithEffects.choiceHistory,
      { sceneId: state.currentSceneId, choiceId, text: choice.text, deltas },
    ],
  };

  return resolveNext(
    scenario,
    withHistory,
    choice.next,
    [...state.cursor.nextPath, { type: "choice", id: choice.id }],
  );
}

export function restart(scenario: Scenario): GameState {
  return createInitialState(scenario);
}
