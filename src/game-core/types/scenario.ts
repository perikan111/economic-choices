export type ComparisonOp = "==" | "!=" | "<" | "<=" | ">" | ">=";

export type Condition =
  | { param: string; op: ComparisonOp; value: number }
  | { flag: string; value?: boolean }
  | { visited: string }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export type Effect =
  | { param: string; op: "add" | "set" | "mul"; value: number }
  | { flag: string; value?: boolean };

export type Next =
  | { type: "goto"; scene: string }
  | { type: "choices"; prompt?: string; choices: Choice[] }
  | { type: "branch"; branches: Branch[]; else: Next }
  | { type: "ending"; ending: string }
  | { type: "resolveEnding" };

export interface Branch {
  when: Condition;
  then: Next;
}

export interface Choice {
  id: string;
  text: string;
  description?: string;
  condition?: Condition;
  ifUnmet?: "hide" | "disable";
  unmetText?: string;
  effects?: Effect[];
  next: Next;
}

export interface Line {
  id?: string;
  speaker: string;
  text: string;
  voiceText?: string;
  expression?: string;
  condition?: Condition;
}

export interface Scene {
  id: string;
  lines: Line[];
  next: Next;
  onEnter?: Effect[];
  background?: string;
  bgm?: string;
}

export interface ParameterDef {
  id: string;
  label: string;
  min?: number;
  max?: number;
  integer?: boolean;
  display?: {
    visible?: boolean;
    order?: number;
    unit?: string;
    goodDirection?: "up" | "down" | "neutral";
  };
}

export interface CharacterDef {
  id: string;
  name: string;
  color?: string;
  portrait?: string;
  expressions?: Record<string, string>;
  voice?: Record<string, string | number>;
}

export interface Ending {
  id: string;
  title: string;
  lines: Line[];
  condition?: Condition;
  rank?: string;
  summary?: string;
  effects?: Effect[];
}

export interface ScenarioMeta {
  id: string;
  title: string;
  version: string;
  locale?: string;
  author?: string;
  summary?: string;
  estimatedMinutes?: number;
  tags?: string[];
}

export interface Scenario {
  formatVersion: 1;
  meta: ScenarioMeta;
  characters: CharacterDef[];
  parameters: ParameterDef[];
  initialState: {
    startScene: string;
    params: Record<string, number>;
    flags: Record<string, boolean>;
  };
  scenes: Scene[];
  endings: Ending[];
}
