"use client";

import { useEffect, useRef } from "react";
import { toSaveData, type GameState, type SaveStorage } from "@/game-core";

function isCheckpoint(previous: GameState, current: GameState): boolean {
  if (previous === current) return false;
  if (previous.currentSceneId !== current.currentSceneId) return true;
  if (previous.cursor.phase === "choice") return true;
  if (previous.cursor.phase !== "ending" && current.cursor.phase === "ending") return true;
  return !previous.finished && current.finished;
}

export function useAutoSave(
  storage: SaveStorage,
  state: GameState,
  enabled: boolean,
  onError: (message: string) => void,
): void {
  const previous = useRef<GameState | null>(null);
  const wasEnabled = useRef(false);

  useEffect(() => {
    const shouldSave = enabled && (
      !wasEnabled.current ||
      previous.current === null ||
      isCheckpoint(previous.current, state)
    );
    previous.current = state;
    wasEnabled.current = enabled;
    if (!shouldSave) return;

    const data = toSaveData(state, {
      savedAt: new Date().toISOString(),
      label: state.cursor.phase === "ending" ? "エンディング" : state.currentSceneId,
    });
    void storage.save("auto", data).catch(() => onError("オートセーブに失敗しました。"));
  }, [enabled, onError, state, storage]);
}
