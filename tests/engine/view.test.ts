import { describe, expect, test } from "vitest";
import { createInitialState, getView, type Scenario } from "@/game-core";
import { engineScenario } from "../fixtures/engineScenario";
import { reachNextChoice } from "../helpers";

describe("getView choices", () => {
  test("character roleをSpeakerViewへ渡す", () => {
    const scenario: Scenario = {
      ...engineScenario,
      characters: engineScenario.characters.map((character) =>
        character.id === "narrator" ? { ...character, role: "案内役" } : character,
      ),
    };

    expect(getView(scenario, createInitialState(scenario)).speaker).toMatchObject({
      id: "narrator",
      name: "案内役",
      role: "案内役",
    });
  });

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
