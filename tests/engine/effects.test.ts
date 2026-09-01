import { describe, expect, test } from "vitest";
import { applyEffects, createInitialState } from "@/game-core";
import { engineScenario } from "../fixtures/engineScenario";

describe("applyEffects", () => {
  test("add・mul・setを順番に適用し、元のstateを変更しない", () => {
    const initial = createInitialState(engineScenario);
    const next = applyEffects(engineScenario, initial, [
      { param: "score", op: "add", value: 4 },
      { param: "score", op: "mul", value: 0.5 },
      { param: "score", op: "set", value: 12.4 },
      { param: "ratio", op: "set", value: 1.26 },
      { flag: "unlocked", value: true },
    ]);

    expect(next.parameters.score).toBe(12);
    expect(next.parameters.ratio).toBe(1.26);
    expect(next.flags.unlocked).toBe(true);
    expect(next.lastDeltas.score).toBe(2);
    expect(next.lastDeltas.ratio).toBeCloseTo(0.01);
    expect(initial.parameters.score).toBe(10);
    expect(initial.flags.unlocked).toBe(false);
  });

  test("パラメータ定義の上下限でクランプする", () => {
    const initial = createInitialState(engineScenario);
    const next = applyEffects(engineScenario, initial, [
      { param: "score", op: "add", value: 999 },
      { param: "resource", op: "add", value: -999 },
    ]);
    expect(next.parameters.score).toBe(20);
    expect(next.parameters.resource).toBe(0);
  });
});
