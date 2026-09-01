import type { Scenario } from "../types/scenario";
import type { Cursor, GameState, NextPathStep } from "../types/state";

export interface SaveData {
  saveVersion: 1;
  scenarioId: string;
  scenarioVersion: string;
  savedAt: string;
  label?: string;
  state: GameState;
}

export type LoadResult =
  | { ok: true; state: GameState; warnings: string[] }
  | { ok: false; error: string };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function toSaveData(
  state: GameState,
  meta: { savedAt: string; label?: string },
): SaveData {
  return {
    saveVersion: 1,
    scenarioId: state.scenarioId,
    scenarioVersion: state.scenarioVersion,
    savedAt: meta.savedAt,
    label: meta.label,
    state: cloneJson(state),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNextPath(value: unknown): value is NextPathStep[] {
  return Array.isArray(value) && value.every((step) =>
    isRecord(step) && (
      (step.type === "branch" && typeof step.index === "number") ||
      (step.type === "choice" && typeof step.id === "string")
    ),
  );
}

function isCursor(value: unknown): value is Cursor {
  if (!isRecord(value) || typeof value.phase !== "string") return false;
  if (value.phase === "line") {
    return typeof value.sceneId === "string" && typeof value.lineIndex === "number";
  }
  if (value.phase === "choice") {
    return typeof value.sceneId === "string" && isNextPath(value.nextPath);
  }
  if (value.phase === "ending") {
    return typeof value.endingId === "string" && typeof value.lineIndex === "number";
  }
  return false;
}

function hasNumericRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "number" && Number.isFinite(item));
}

function hasBooleanRecord(value: unknown): value is Record<string, boolean> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "boolean");
}

function validStateShape(value: unknown): value is GameState {
  if (!isRecord(value)) return false;
  return (
    typeof value.scenarioId === "string" &&
    typeof value.scenarioVersion === "string" &&
    isCursor(value.cursor) &&
    typeof value.currentSceneId === "string" &&
    hasNumericRecord(value.parameters) &&
    hasBooleanRecord(value.flags) &&
    Array.isArray(value.visitedScenes) && value.visitedScenes.every((item) => typeof item === "string") &&
    Array.isArray(value.history) &&
    Array.isArray(value.choiceHistory) &&
    Array.isArray(value.reachedEndings) && value.reachedEndings.every((item) => typeof item === "string") &&
    hasNumericRecord(value.lastDeltas) &&
    typeof value.finished === "boolean"
  );
}

export function fromSaveData(scenario: Scenario, raw: unknown): LoadResult {
  if (!isRecord(raw) || raw.saveVersion !== 1 || !validStateShape(raw.state)) {
    return { ok: false, error: "セーブデータの形式が不正です。" };
  }
  if (raw.scenarioId !== scenario.meta.id || raw.state.scenarioId !== scenario.meta.id) {
    return { ok: false, error: "別のシナリオのセーブデータです。" };
  }

  const state = raw.state;
  const parameterIds = new Set(scenario.parameters.map((parameter) => parameter.id));
  const flagIds = new Set(Object.keys(scenario.initialState.flags));
  if (
    Object.keys(state.parameters).length !== parameterIds.size ||
    Object.keys(state.parameters).some((id) => !parameterIds.has(id)) ||
    Object.keys(state.flags).length !== flagIds.size ||
    Object.keys(state.flags).some((id) => !flagIds.has(id))
  ) {
    return { ok: false, error: "シナリオ更新によりパラメータまたはフラグの構成が変わりました。" };
  }

  const sceneIds = new Set(scenario.scenes.map((scene) => scene.id));
  const endingIds = new Set(scenario.endings.map((ending) => ending.id));
  if (!sceneIds.has(state.currentSceneId)) {
    return { ok: false, error: "セーブ地点のシーンが現在のシナリオに存在しません。" };
  }
  if (state.cursor.phase !== "ending" && state.currentSceneId !== state.cursor.sceneId) {
    return { ok: false, error: "currentSceneId と cursor.sceneId が一致しないセーブデータです。" };
  }
  if (
    (state.cursor.phase !== "ending" && !sceneIds.has(state.cursor.sceneId)) ||
    (state.cursor.phase === "ending" && !endingIds.has(state.cursor.endingId))
  ) {
    return { ok: false, error: "セーブ地点のカーソルが現在のシナリオに存在しません。" };
  }

  const warnings: string[] = [];
  if (raw.scenarioVersion !== scenario.meta.version) {
    warnings.push("シナリオのバージョンが変わっています。互換性のある範囲で読み込みました。");
  }
  return { ok: true, state: cloneJson(state), warnings };
}
