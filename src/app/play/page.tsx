import { Suspense } from "react";
import { GameScreen } from "@/components/game/GameScreen";

export default function PlayPage() {
  return (
    <Suspense fallback={<main className="loading-screen">ゲームを準備しています…</main>}>
      <GameScreen />
    </Suspense>
  );
}
