"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  scenarioCatalog,
  type PlayableScenarioCatalogEntry,
} from "@/content/scenarios";
import { fromSaveData } from "@/game-core";
import { createLocalStorageSave } from "@/platform/web/localStorageSave";

const playableScenarios: PlayableScenarioCatalogEntry[] = scenarioCatalog.flatMap((entry) =>
  entry.status === "playable" ? [entry] : [],
);

export default function HomePage() {
  const [continueAvailability, setContinueAvailability] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    void Promise.all(playableScenarios.map(async (entry) => {
      try {
        const storage = createLocalStorageSave(entry.scenario.meta.id);
        const saved = await storage.load("auto");
        return [entry.id, Boolean(saved && fromSaveData(entry.scenario, saved).ok)] as const;
      } catch {
        return [entry.id, false] as const;
      }
    })).then((availability) => {
      if (!cancelled) setContinueAvailability(Object.fromEntries(availability));
    });

    return () => { cancelled = true; };
  }, []);

  return (
    <main className="series-home">
      <header className="series-hero">
        <p className="eyebrow">POLICY SIMULATION SERIES</p>
        <h1>ECONOMIC CHOICES</h1>
        <p className="series-introduction">
          政策を選び、その先に起きることを体験する短編シミュレーション。<br />
          正解を当てるゲームではありません。何を守り、何を諦めるかを選びます。
        </p>
      </header>

      <section className="scenario-section" aria-labelledby="scenario-heading">
        <div className="section-heading">
          <p className="eyebrow">SELECT A SCENARIO</p>
          <h2 id="scenario-heading">シナリオ</h2>
        </div>

        <div className="scenario-grid">
          {scenarioCatalog.map((entry) => {
            const isPlayable = entry.status === "playable";
            const canContinue = isPlayable && Boolean(continueAvailability[entry.id]);

            return (
              <article
                className={`scenario-card scenario-card-${entry.status}`}
                key={entry.id}
              >
                <div className="scenario-card-heading">
                  <p>SCENARIO {String(entry.number).padStart(2, "0")}</p>
                  <span className={`scenario-status scenario-status-${entry.status}`}>
                    {isPlayable ? "公開中" : "実装予定"}
                  </span>
                </div>
                <h3>{entry.title}</h3>
                <p className="scenario-summary">{entry.summary}</p>
                <p className="scenario-description">{entry.description}</p>

                {isPlayable ? (
                  <div className="scenario-card-footer">
                    <p className="scenario-duration">プレイ時間 約{entry.estimatedMinutes ?? 5}分</p>
                    <div className="scenario-actions">
                      <Link className="primary-button link-button" href="/play?new=1">
                        はじめから
                      </Link>
                      {canContinue ? (
                        <Link className="secondary-button link-button" href="/play">
                          つづきから
                        </Link>
                      ) : (
                        <button className="secondary-button" disabled type="button">
                          つづきから
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="scenario-planned-note">このシナリオは現在プレイできません。</p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <footer className="prototype-note">
        <p className="eyebrow">PROTOTYPE / TEST BUILD</p>
        <p>
          現在はシナリオ01のみプレイできます。<br />
          今後、異なる経済・政策テーマの短編シナリオを追加し、イラスト・音声なども実装する予定です。
        </p>
      </footer>
    </main>
  );
}
