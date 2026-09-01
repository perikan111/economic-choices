import { describe, expect, test } from "vitest";
import { choose, createInitialState, restart } from "@/game-core";
import { engineScenario } from "../fixtures/engineScenario";
import { reachNextChoice } from "../helpers";

describe("game session", () => {
  test("選択効果・flag・履歴を記録する", () => {
    const atChoice = reachNextChoice(engineScenario, createInitialState(engineScenario));
    const chosen = choose(engineScenario, atChoice, "nested-start");

    expect(chosen.cursor).toEqual({
      phase: "choice",
      sceneId: "decision",
      nextPath: [
        { type: "choice", id: "nested-start" },
        { type: "branch", index: 0 },
      ],
    });
    expect(chosen.parameters.score).toBe(13);
    expect(chosen.flags.unlocked).toBe(true);
    expect(chosen.choiceHistory.at(-1)).toMatchObject({ choiceId: "nested-start" });
  });

  test("branch内の選択から次のシーンへ遷移する", () => {
    let state = reachNextChoice(engineScenario, createInitialState(engineScenario));
    state = choose(engineScenario, state, "nested-start");
    state = choose(engineScenario, state, "nested-continue");

    expect(state.currentSceneId).toBe("finale");
    expect(state.cursor).toMatchObject({ phase: "line", sceneId: "finale" });
    expect(state.parameters.resource).toBe(7);
    expect(state.flags.branchTaken).toBe(true);
    expect(state.visitedScenes).toContain("finale");
  });

  test("restartで完全な初期状態へ戻る", () => {
    const initial = createInitialState(engineScenario);
    const atChoice = reachNextChoice(engineScenario, initial);
    const changed = choose(engineScenario, atChoice, "nested-start");
    const restarted = restart(engineScenario);

    expect(restarted).toEqual(initial);
    expect(restarted).not.toEqual(changed);
    expect(restarted.choiceHistory).toEqual([]);
    expect(restarted.reachedEndings).toEqual([]);
  });
});
