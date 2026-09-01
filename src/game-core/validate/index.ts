import { ScenarioError } from "../errors";
import type { Scenario } from "../types/scenario";
import { validateIntegrity } from "./integrity";
import { validateStructure } from "./schema";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateScenario(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (validateStructure(raw, errors)) validateIntegrity(raw, errors, warnings);
  return { ok: errors.length === 0, errors, warnings };
}

export function loadScenario(raw: unknown): Scenario {
  const result = validateScenario(raw);
  if (!result.ok) throw new ScenarioError(result.errors);
  return raw as Scenario;
}
