export interface SpeakerView {
  id: string;
  name: string;
  color?: string;
}

export interface ChoiceView {
  id: string;
  text: string;
  description?: string;
  enabled: boolean;
  unmetText?: string;
}

export interface ParamView {
  id: string;
  label: string;
  value: number;
  delta: number;
  unit?: string;
  goodDirection: "up" | "down" | "neutral";
}

export interface EndingView {
  id: string;
  title: string;
  rank?: string;
  summary?: string;
  narrative: string[];
}

export interface GameView {
  phase: "line" | "choice" | "ending";
  background?: string;
  speaker: SpeakerView | null;
  text: string;
  canAdvance: boolean;
  prompt?: string;
  choices: ChoiceView[];
  params: ParamView[];
  ending?: EndingView;
  finished: boolean;
}
