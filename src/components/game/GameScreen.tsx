"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { breadPriceScenario } from "@/content/scenarios";
import { fromSaveData, restart, toSaveData } from "@/game-core";
import { useAutoSave } from "@/features/game/useAutoSave";
import { useGameSession } from "@/features/game/useGameSession";
import { createLocalStorageSave } from "@/platform/web/localStorageSave";
import { ChoiceList } from "./ChoiceList";
import { DialogueBox } from "./DialogueBox";
import { EndingView } from "./EndingView";
import { ParameterHud } from "./ParameterHud";

export function GameScreen() {
  const searchParams = useSearchParams();
  const scenario = breadPriceScenario;
  const storage = useMemo(() => createLocalStorageSave(scenario.meta.id), [scenario.meta.id]);
  const {
    state,
    view,
    advance,
    choose,
    restart: restartSession,
    replace,
  } = useGameSession(scenario);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const showDebug = process.env.NODE_ENV !== "production";
  const setSaveError = useCallback((message: string) => setStatus(message), []);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      if (searchParams.get("new") === "1") {
        replace(restart(scenario));
        if (!cancelled) setReady(true);
        return;
      }
      const saved = await storage.load("auto");
      if (cancelled) return;
      if (saved) {
        const result = fromSaveData(scenario, saved);
        if (result.ok) {
          replace(result.state);
          if (result.warnings.length > 0) setStatus(result.warnings.join(" "));
        } else {
          setStatus(`${result.error} 最初から開始しました。`);
        }
      }
      setReady(true);
    };
    void initialize().catch(() => {
      if (!cancelled) {
        setStatus("セーブデータを読み込めなかったため、最初から開始しました。");
        setReady(true);
      }
    });
    return () => { cancelled = true; };
  }, [replace, scenario, searchParams, storage]);

  useAutoSave(storage, state, ready, setSaveError);

  useEffect(() => {
    if (!ready || !view.canAdvance) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target instanceof HTMLElement && ["BUTTON", "A", "INPUT"].includes(event.target.tagName)) return;
      event.preventDefault();
      advance();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, ready, view.canAdvance]);

  const saveManual = async () => {
    await storage.save("1", toSaveData(state, {
      savedAt: new Date().toISOString(),
      label: state.currentSceneId,
    }));
    setStatus("手動セーブに保存しました。");
  };

  const loadManual = async () => {
    const saved = await storage.load("1");
    if (!saved) {
      setStatus("手動セーブはありません。");
      return;
    }
    const result = fromSaveData(scenario, saved);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    replace(result.state);
    setStatus(result.warnings.length > 0 ? result.warnings.join(" ") : "手動セーブを読み込みました。");
  };

  const deleteSaves = async () => {
    await Promise.all([storage.remove("auto"), storage.remove("1")]);
    setStatus("オートセーブと手動セーブを削除しました。");
  };

  const playAgain = () => {
    restartSession();
    setStatus("最初から開始しました。");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!ready) {
    return <main className="loading-screen">セーブデータを確認しています…</main>;
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <Link className="back-link" href="/">← シナリオ選択へ</Link>
          <h1>{scenario.meta.title}</h1>
        </div>
        <nav className="save-controls" aria-label="セーブ操作">
          <button onClick={() => void saveManual()} type="button">保存</button>
          <button onClick={() => void loadManual()} type="button">読込</button>
          <button onClick={() => void deleteSaves()} type="button">セーブ削除</button>
        </nav>
      </header>

      {status && <p className="status-message" role="status">{status}</p>}
      <ParameterHud parameters={view.params} />

      {view.finished && view.ending ? (
        <EndingView
          choices={state.choiceHistory}
          ending={view.ending}
          onRestart={playAgain}
          parameters={view.params}
        />
      ) : (
        <section className="novel-stage">
          {view.phase === "ending" && view.ending && (
            <p className="ending-kicker">ENDING · {view.ending.title}</p>
          )}
          <DialogueBox speaker={view.speaker} text={view.text} />

          {view.phase === "choice" ? (
            <ChoiceList
              choices={view.choices}
              onChoose={choose}
              prompt={view.prompt}
            />
          ) : (
            <div className="advance-row">
              <span>Enter / Space でも進めます</span>
              <button className="primary-button" disabled={!view.canAdvance} onClick={advance} type="button">
                {view.phase === "ending" ? "結果を見る" : "次へ"}
              </button>
            </div>
          )}
        </section>
      )}

      {showDebug && (
        <details className="debug-panel">
          <summary>Debug</summary>
          <pre>{JSON.stringify({
            currentSceneId: state.currentSceneId,
            parameters: state.parameters,
            flags: state.flags,
          }, null, 2)}</pre>
        </details>
      )}
    </main>
  );
}
