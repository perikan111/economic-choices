import type { Line } from "../types/scenario";
import type { GameState } from "../types/state";
import { evaluateCondition } from "./conditions";

export function getVisibleLines(lines: Line[], state: GameState): Line[] {
  return lines.filter((line) => !line.condition || evaluateCondition(state, line.condition));
}

export function interpolateText(text: string, state: GameState): string {
  return text.replace(/\{\{param\.([A-Za-z0-9_-]+)\}\}/g, (_match, id: string) => {
    const value = state.parameters[id];
    return value === undefined ? `{{param.${id}}}` : String(value);
  });
}
