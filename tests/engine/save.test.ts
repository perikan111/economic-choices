import { describe, expect, test } from "vitest";
import { choose, createInitialState, fromSaveData, getView, toSaveData } from "@/game-core";
import { engineScenario } from "../fixtures/engineScenario";
import { reachNextChoice } from "../helpers";

describe("save format", () => {
  test("GameStateをJSON保存して完全に復元できる", () => {
    const atChoice = reachNextChoice(engineScenario, createInitialState(engineScenario));
    const state = choose(engineScenario, atChoice, "skip");
    const save = toSaveData(state, { savedAt: "2026-09-01T00:00:00.000Z", label: "test" });
    const jsonRoundTrip = JSON.parse(JSON.stringify(save)) as unknown;
    const loaded = fromSaveData(engineScenario, jsonRoundTrip);

    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.state).toEqual(state);
  });

  test("nextPathを含むchoice状態をJSON保存し、同じ選択肢へ復元できる", () => {
    const rootChoice = reachNextChoice(engineScenario, createInitialState(engineScenario));
    const nestedChoice = choose(engineScenario, rootChoice, "nested-start");
    expect(nestedChoice.cursor).toMatchObject({
      phase: "choice",
      nextPath: [
        { type: "choice", id: "nested-start" },
        { type: "branch", index: 0 },
      ],
    });

    const viewBefore = getView(engineScenario, nestedChoice);
    const jsonRoundTrip = JSON.parse(JSON.stringify(
      toSaveData(nestedChoice, { savedAt: "2026-09-01T00:00:00.000Z" }),
    )) as unknown;
    const loaded = fromSaveData(engineScenario, jsonRoundTrip);

    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.state).toEqual(nestedChoice);
      expect(getView(engineScenario, loaded.state)).toEqual(viewBefore);
      expect(getView(engineScenario, loaded.state).choices.map((choice) => choice.id)).toEqual(["nested-continue"]);
    }
  });

  test("currentSceneIdとcursor.sceneIdが不一致のセーブを拒否する", () => {
    const rootChoice = reachNextChoice(engineScenario, createInitialState(engineScenario));
    const nestedChoice = choose(engineScenario, rootChoice, "nested-start");
    const save = toSaveData(nestedChoice, { savedAt: "2026-09-01T00:00:00.000Z" });
    save.state.currentSceneId = "intro";

    expect(fromSaveData(engineScenario, save)).toEqual({
      ok: false,
      error: "currentSceneId と cursor.sceneId が一致しないセーブデータです。",
    });
  });

  test("別シナリオIDのデータを拒否する", () => {
    const state = createInitialState(engineScenario);
    const save = { ...toSaveData(state, { savedAt: "2026-09-01T00:00:00.000Z" }), scenarioId: "other" };
    expect(fromSaveData(engineScenario, save)).toMatchObject({ ok: false });
  });
});
