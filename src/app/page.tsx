"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { breadPriceScenario } from "@/content/scenarios";
import { fromSaveData } from "@/game-core";
import { createLocalStorageSave } from "@/platform/web/localStorageSave";

export default function HomePage() {
  const scenario = breadPriceScenario;
  const storage = useMemo(() => createLocalStorageSave(scenario.meta.id), [scenario.meta.id]);
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void storage.load("auto").then((saved) => {
      if (!cancelled && saved) setCanContinue(fromSaveData(scenario, saved).ok);
    });
    return () => { cancelled = true; };
  }, [scenario, storage]);

  return (
    <main className="title-screen">
      <section className="title-card">
        <p className="eyebrow">ECONOMIC CHOICES · MVP</p>
        <h1>{scenario.meta.title}</h1>
        <p className="title-summary">{scenario.meta.summary}</p>
        <p className="title-role">あなたは就任直後の市長。三つの政策判断で、都市の朝を変えてください。</p>
        <div className="title-actions">
          <Link className="primary-button link-button" href="/play?new=1">はじめから</Link>
          <Link
            aria-disabled={!canContinue}
            className={`secondary-button link-button ${canContinue ? "" : "disabled"}`}
            href={canContinue ? "/play" : "#"}
          >
            つづきから
          </Link>
        </div>
        <p className="title-note">プレイ時間 約{scenario.meta.estimatedMinutes ?? 5}分 · 音声・画像なし</p>
      </section>
    </main>
  );
}
