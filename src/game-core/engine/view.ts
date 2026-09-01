import { EngineError } from "../errors";
import type { Line, Scenario } from "../types/scenario";
import type { GameState } from "../types/state";
import type { GameView, SpeakerView } from "../types/view";
import { evaluateCondition } from "./conditions";
import { getVisibleLines, interpolateText } from "./lines";
import { getPendingChoices } from "./transition";

function speakerFor(scenario: Scenario, line: Line | undefined): SpeakerView | null {
  if (!line) return null;
  const character = scenario.characters.find((candidate) => candidate.id === line.speaker);
  if (!character) throw new EngineError(`話者 "${line.speaker}" が存在しません。`);
  return { id: character.id, name: character.name, color: character.color };
}

export function getView(scenario: Scenario, state: GameState): GameView {
  const params = scenario.parameters
    .filter((definition) => definition.display?.visible !== false)
    .sort((a, b) => (a.display?.order ?? 0) - (b.display?.order ?? 0))
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      value: state.parameters[definition.id],
      delta: state.lastDeltas[definition.id] ?? 0,
      unit: definition.display?.unit,
      goodDirection: definition.display?.goodDirection ?? ("neutral" as const),
    }));

  if (state.cursor.phase === "ending") {
    const endingId = state.cursor.endingId;
    const ending = scenario.endings.find((candidate) => candidate.id === endingId);
    if (!ending) throw new EngineError(`エンディング "${endingId}" が存在しません。`);
    const lines = getVisibleLines(ending.lines, state);
    const line = state.finished ? undefined : lines[state.cursor.lineIndex];
    return {
      phase: "ending",
      speaker: speakerFor(scenario, line),
      text: line ? interpolateText(line.text, state) : "",
      canAdvance: !state.finished,
      choices: [],
      params,
      ending: {
        id: ending.id,
        title: ending.title,
        rank: ending.rank,
        summary: ending.summary,
        narrative: lines.map((item) => interpolateText(item.text, state)),
      },
      finished: state.finished,
    };
  }

  const scene = scenario.scenes.find((candidate) => candidate.id === state.currentSceneId);
  if (!scene) throw new EngineError(`シーン "${state.currentSceneId}" が存在しません。`);
  const lines = getVisibleLines(scene.lines, state);

  if (state.cursor.phase === "choice") {
    const { next } = getPendingChoices(scenario, state);
    const lastLine = lines.at(-1);
    const choices = next.choices.flatMap((choice) => {
      const meetsCondition = !choice.condition || evaluateCondition(state, choice.condition);
      if (!meetsCondition && (choice.ifUnmet ?? "hide") === "hide") return [];
      return [{
        id: choice.id,
        text: choice.text,
        description: choice.description,
        enabled: meetsCondition,
        unmetText: meetsCondition ? undefined : choice.unmetText,
      }];
    });
    return {
      phase: "choice",
      background: scene.background,
      speaker: speakerFor(scenario, lastLine),
      text: lastLine ? interpolateText(lastLine.text, state) : "",
      canAdvance: false,
      prompt: next.prompt,
      choices,
      params,
      finished: false,
    };
  }

  const line = lines[state.cursor.lineIndex];
  return {
    phase: "line",
    background: scene.background,
    speaker: speakerFor(scenario, line),
    text: line ? interpolateText(line.text, state) : "",
    canAdvance: true,
    choices: [],
    params,
    finished: false,
  };
}
