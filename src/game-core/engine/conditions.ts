import { EngineError } from "../errors";
import type { Condition } from "../types/scenario";
import type { GameState } from "../types/state";

export function evaluateCondition(state: GameState, condition: Condition): boolean {
  if ("param" in condition) {
    const actual = state.parameters[condition.param];
    if (actual === undefined) {
      throw new EngineError(`未定義のパラメータ "${condition.param}" を条件で参照しました。`);
    }

    switch (condition.op) {
      case "==":
        return actual === condition.value;
      case "!=":
        return actual !== condition.value;
      case "<":
        return actual < condition.value;
      case "<=":
        return actual <= condition.value;
      case ">":
        return actual > condition.value;
      case ">=":
        return actual >= condition.value;
    }
  }

  if ("flag" in condition) {
    const actual = state.flags[condition.flag];
    if (actual === undefined) {
      throw new EngineError(`未定義のフラグ "${condition.flag}" を条件で参照しました。`);
    }
    return actual === (condition.value ?? true);
  }

  if ("visited" in condition) {
    return state.visitedScenes.includes(condition.visited);
  }

  if ("all" in condition) {
    return condition.all.every((item) => evaluateCondition(state, item));
  }

  if ("any" in condition) {
    return condition.any.some((item) => evaluateCondition(state, item));
  }

  if ("not" in condition) {
    return !evaluateCondition(state, condition.not);
  }

  throw new EngineError("解釈できない条件です。");
}
