export class ScenarioError extends Error {
  constructor(public readonly errors: string[]) {
    super(`シナリオの検証に失敗しました:\n${errors.join("\n")}`);
    this.name = "ScenarioError";
  }
}

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}
