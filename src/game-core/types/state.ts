export type Cursor =
  | { phase: "line"; sceneId: string; lineIndex: number }
  | { phase: "choice"; sceneId: string; nextPath: NextPathStep[] }
  | { phase: "ending"; endingId: string; lineIndex: number };

export type NextPathStep =
  | { type: "branch"; index: number }
  | { type: "choice"; id: string };

export interface HistoryEntry {
  type: "scene" | "choice";
  sceneId: string;
  choiceId?: string;
  deltas?: Record<string, number>;
}

export interface ChoiceHistoryEntry {
  sceneId: string;
  choiceId: string;
  text: string;
  deltas: Record<string, number>;
}

export interface GameState {
  scenarioId: string;
  scenarioVersion: string;
  cursor: Cursor;
  currentSceneId: string;
  parameters: Record<string, number>;
  flags: Record<string, boolean>;
  visitedScenes: string[];
  history: HistoryEntry[];
  choiceHistory: ChoiceHistoryEntry[];
  reachedEndings: string[];
  lastDeltas: Record<string, number>;
  finished: boolean;
}
