import type { ParamView } from "@/game-core";

export function formatParameter(parameter: ParamView): string {
  return `${parameter.value}${parameter.unit ?? ""}`;
}

export function formatDelta(parameter: ParamView): string {
  if (parameter.delta === 0) return "";
  const prefix = parameter.delta > 0 ? "+" : "";
  return `${prefix}${parameter.delta}${parameter.unit ?? ""}`;
}
