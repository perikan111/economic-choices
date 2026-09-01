import type { ChoiceHistoryEntry, EndingView as EndingData, ParamView } from "@/game-core";
import { formatParameter } from "@/features/game/format";

interface EndingViewProps {
  ending: EndingData;
  parameters: ParamView[];
  choices: ChoiceHistoryEntry[];
  onRestart(): void;
}

export function EndingView({ ending, parameters, choices, onRestart }: EndingViewProps) {
  return (
    <section className={`ending-view rank-${ending.rank ?? "normal"}`}>
      <p className="eyebrow">ENDING · {ending.rank ?? "normal"}</p>
      <h1>{ending.title}</h1>
      {ending.narrative.map((line, index) => <p className="ending-narrative" key={index}>{line}</p>)}
      {ending.summary && <p className="ending-summary">{ending.summary}</p>}

      <div className="result-grid">
        <section>
          <h2>最終パラメータ</h2>
          <dl className="result-parameters">
            {parameters.map((parameter) => (
              <div key={parameter.id}>
                <dt>{parameter.label}</dt>
                <dd>{formatParameter(parameter)}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h2>選択履歴</h2>
          <ol className="choice-history">
            {choices.map((choice) => <li key={`${choice.sceneId}:${choice.choiceId}`}>{choice.text}</li>)}
          </ol>
        </section>
      </div>

      <p className="model-note">この結果は、政策のトレードオフを体験するための単純化されたモデルです。</p>
      <button className="primary-button" onClick={onRestart} type="button">最初から遊ぶ</button>
    </section>
  );
}
