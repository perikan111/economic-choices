import { describe, expect, test } from "vitest";
import { createInitialState, evaluateCondition } from "@/game-core";
import { engineScenario } from "../fixtures/engineScenario";

describe("evaluateCondition", () => {
  const state = createInitialState(engineScenario);

  test.each([
    [{ param: "score", op: "==", value: 10 }, true],
    [{ param: "score", op: "==", value: 11 }, false],
    [{ param: "score", op: "!=", value: 11 }, true],
    [{ param: "score", op: "!=", value: 10 }, false],
    [{ param: "score", op: "<", value: 11 }, true],
    [{ param: "score", op: "<", value: 10 }, false],
    [{ param: "score", op: "<=", value: 10 }, true],
    [{ param: "score", op: "<=", value: 9 }, false],
    [{ param: "score", op: ">", value: 9 }, true],
    [{ param: "score", op: ">", value: 10 }, false],
    [{ param: "score", op: ">=", value: 10 }, true],
    [{ param: "score", op: ">=", value: 11 }, false],
  ] as const)("比較条件 %# を評価する", (condition, expected) => {
    expect(evaluateCondition(state, condition)).toBe(expected);
  });

  test("flag・visited・論理演算を評価する", () => {
    expect(evaluateCondition(state, { flag: "unlocked", value: false })).toBe(true);
    expect(evaluateCondition(state, { visited: "intro" })).toBe(true);
    expect(evaluateCondition(state, { all: [] })).toBe(true);
    expect(evaluateCondition(state, { any: [] })).toBe(false);
    expect(evaluateCondition(state, {
      all: [
        { param: "resource", op: ">=", value: 5 },
        { not: { flag: "unlocked" } },
        { any: [{ visited: "intro" }, { visited: "finale" }] },
      ],
    })).toBe(true);
  });
});
