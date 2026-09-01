import { EngineError } from "../errors";
import type { Choice, Next, Scenario } from "../types/scenario";
import type { GameState, NextPathStep } from "../types/state";
import { evaluateCondition } from "./conditions";
import { applyEffects } from "./effects";
import { getVisibleLines } from "./lines";

const MAX_TRANSITIONS = 64;

export function locateNext(root: Next, path: NextPathStep[]): Next {
  let current = root;
  for (const step of path) {
    if (step.type === "branch") {
      if (current.type !== "branch") {
        throw new EngineError("保存された分岐パスが現在のシナリオと一致しません。初めから遊んでください。");
      }
      current = step.index === -1 ? current.else : current.branches[step.index]?.then;
      if (!current) throw new EngineError("保存された分岐パスが存在しません。");
    } else {
      if (current.type !== "choices") {
        throw new EngineError("保存された選択パスが現在のシナリオと一致しません。初めから遊んでください。");
      }
      const choice = current.choices.find((candidate) => candidate.id === step.id);
      if (!choice) throw new EngineError(`保存された選択肢 "${step.id}" が存在しません。`);
      current = choice.next;
    }
  }
  return current;
}

export function getPendingChoices(scenario: Scenario, state: GameState): { next: Extract<Next, { type: "choices" }>; choices: Choice[] } {
  if (state.cursor.phase !== "choice") {
    throw new EngineError("現在は選択肢を待っていません。");
  }
  const sceneId = state.cursor.sceneId;
  const scene = scenario.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) throw new EngineError(`シーン "${sceneId}" が存在しません。`);
  const next = locateNext(scene.next, state.cursor.nextPath);
  if (next.type !== "choices") throw new EngineError("保存されたカーソルの選択肢が見つかりません。");
  return { next, choices: next.choices };
}

function enterEnding(
  scenario: Scenario,
  state: GameState,
  endingId: string,
): GameState {
  const ending = scenario.endings.find((candidate) => candidate.id === endingId);
  if (!ending) throw new EngineError(`エンディング "${endingId}" が存在しません。`);

  let nextState = applyEffects(scenario, state, ending.effects ?? []);
  const reachedEndings = nextState.reachedEndings.includes(ending.id)
    ? nextState.reachedEndings
    : [...nextState.reachedEndings, ending.id];
  const hasLines = getVisibleLines(ending.lines, nextState).length > 0;
  nextState = {
    ...nextState,
    cursor: { phase: "ending", endingId: ending.id, lineIndex: 0 },
    reachedEndings,
    finished: !hasLines,
  };
  return nextState;
}

function resolveEnding(scenario: Scenario, state: GameState): GameState {
  const ending = scenario.endings.find(
    (candidate) => !candidate.condition || evaluateCondition(state, candidate.condition),
  );
  if (!ending) throw new EngineError("条件に一致するエンディングがありません。");
  return enterEnding(scenario, state, ending.id);
}

function enterScene(
  scenario: Scenario,
  state: GameState,
  sceneId: string,
  depth: number,
): GameState {
  const scene = scenario.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) throw new EngineError(`シーン "${sceneId}" が存在しません。`);

  let nextState: GameState = {
    ...state,
    cursor: { phase: "line", sceneId, lineIndex: 0 },
    currentSceneId: sceneId,
    visitedScenes: state.visitedScenes.includes(sceneId)
      ? state.visitedScenes
      : [...state.visitedScenes, sceneId],
    history: [...state.history, { type: "scene", sceneId }],
    finished: false,
  };
  nextState = applyEffects(scenario, nextState, scene.onEnter ?? []);

  if (getVisibleLines(scene.lines, nextState).length === 0) {
    return resolveNext(scenario, nextState, scene.next, [], depth + 1);
  }
  return nextState;
}

export function resolveNext(
  scenario: Scenario,
  state: GameState,
  next: Next,
  path: NextPathStep[] = [],
  depth = 0,
): GameState {
  if (depth > MAX_TRANSITIONS) {
    throw new EngineError(`連続遷移が上限 ${MAX_TRANSITIONS} 回を超えました。シナリオにループがないか確認してください。`);
  }

  switch (next.type) {
    case "goto":
      return enterScene(scenario, state, next.scene, depth);
    case "choices":
      return {
        ...state,
        cursor: { phase: "choice", sceneId: state.currentSceneId, nextPath: path },
      };
    case "branch": {
      const index = next.branches.findIndex((branch) => evaluateCondition(state, branch.when));
      const selected = index === -1 ? next.else : next.branches[index].then;
      return resolveNext(
        scenario,
        state,
        selected,
        [...path, { type: "branch", index }],
        depth + 1,
      );
    }
    case "ending":
      return enterEnding(scenario, state, next.ending);
    case "resolveEnding":
      return resolveEnding(scenario, state);
  }
}
