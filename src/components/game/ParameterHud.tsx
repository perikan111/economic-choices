import type { ParamView } from "@/game-core";
import { formatDelta, formatParameter } from "@/features/game/format";

function deltaTone(parameter: ParamView): string {
  if (parameter.delta === 0 || parameter.goodDirection === "neutral") return "neutral";
  const improved = parameter.goodDirection === "up" ? parameter.delta > 0 : parameter.delta < 0;
  return improved ? "good" : "bad";
}

export function ParameterHud({ parameters }: { parameters: ParamView[] }) {
  return (
    <section className="parameter-hud" aria-label="現在のパラメータ">
      {parameters.map((parameter) => (
        <div className="parameter-card" key={parameter.id}>
          <span className="parameter-label">{parameter.label}</span>
          <strong>{formatParameter(parameter)}</strong>
          {parameter.delta !== 0 && (
            <span className={`parameter-delta ${deltaTone(parameter)}`}>
              {formatDelta(parameter)}
            </span>
          )}
        </div>
      ))}
    </section>
  );
}
