import { describe, expect, test } from "vitest";
import { createInitialState, getView } from "@/game-core";
import { engineScenario } from "../fixtures/engineScenario";
import { reachNextChoice } from "../helpers";

describe("getView choices", () => {
  test("ifUnmet: hideの条件未達選択肢を配列から除外する", () => {
    const state = reachNextChoice(engineScenario, createInitialState(engineScenario));
    const view = getView(engineScenario, state);

    expect(view.phase).toBe("choice");
    expect(view.choices.some((choice) => choice.id === "hidden-choice")).toBe(false);
  });

  test("ifUnmet: disableの条件未達選択肢を理由付きで残す", () => {
    const state = reachNextChoice(engineScenario, createInitialState(engineScenario));
    const view = getView(engineScenario, state);
    const choice = view.choices.find((candidate) => candidate.id === "disabled-choice");

    expect(choice).toEqual(expect.objectContaining({
      id: "disabled-choice",
      enabled: false,
      unmetText: "資源が10以上必要です。",
    }));
  });
});
