import type { ChoiceView } from "@/game-core";

interface ChoiceListProps {
  prompt?: string;
  choices: ChoiceView[];
  onChoose(id: string): void;
}

export function ChoiceList({ prompt, choices, onChoose }: ChoiceListProps) {
  return (
    <section className="choice-panel" aria-label="選択肢">
      {prompt && <h2>{prompt}</h2>}
      <div className="choice-list">
        {choices.map((choice, index) => (
          <button
            className="choice-button"
            disabled={!choice.enabled}
            key={choice.id}
            onClick={() => onChoose(choice.id)}
            type="button"
          >
            <span className="choice-index">{String.fromCharCode(65 + index)}</span>
            <span className="choice-copy">
              <strong>{choice.text}</strong>
              {choice.description && <small>{choice.description}</small>}
              {!choice.enabled && choice.unmetText && <small className="unmet-text">{choice.unmetText}</small>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
