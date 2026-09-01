import { EngineError } from "../errors";
import type { Effect, ParameterDef, Scenario } from "../types/scenario";
import type { GameState } from "../types/state";

function normalizeValue(value: number, definition: ParameterDef): number {
  let normalized = definition.integer === false ? value : Math.round(value);
  if (definition.min !== undefined) normalized = Math.max(definition.min, normalized);
  if (definition.max !== undefined) normalized = Math.min(definition.max, normalized);
  return normalized;
}

export function applyEffects(
  scenario: Scenario,
  state: GameState,
  effects: Effect[],
): GameState {
  if (effects.length === 0) return state;

  const definitions = new Map(scenario.parameters.map((definition) => [definition.id, definition]));
  const parameters = { ...state.parameters };
  const flags = { ...state.flags };
  const lastDeltas = { ...state.lastDeltas };

  for (const effect of effects) {
    if ("param" in effect) {
      const definition = definitions.get(effect.param);
      const current = parameters[effect.param];
      if (!definition || current === undefined) {
        throw new EngineError(`未定義のパラメータ "${effect.param}" に効果を適用しました。`);
      }

      const raw =
        effect.op === "add"
          ? current + effect.value
          : effect.op === "mul"
            ? current * effect.value
            : effect.value;
      const next = normalizeValue(raw, definition);
      parameters[effect.param] = next;
      lastDeltas[effect.param] = (lastDeltas[effect.param] ?? 0) + (next - current);
    } else {
      if (!(effect.flag in flags)) {
        throw new EngineError(`未定義のフラグ "${effect.flag}" に効果を適用しました。`);
      }
      flags[effect.flag] = effect.value ?? true;
    }
  }

  return { ...state, parameters, flags, lastDeltas };
}
