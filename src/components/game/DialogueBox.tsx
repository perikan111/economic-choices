import type { SpeakerView } from "@/game-core";

interface DialogueBoxProps {
  speaker: SpeakerView | null;
  text: string;
}

export function DialogueBox({ speaker, text }: DialogueBoxProps) {
  return (
    <section className="dialogue-box" aria-live="polite">
      {speaker?.name && (
        <p className="speaker-name" style={{ color: speaker.color }}>
          {speaker.role ? `${speaker.role}｜${speaker.name}` : speaker.name}
        </p>
      )}
      <p className={speaker?.name ? "dialogue-text" : "dialogue-text narration"}>{text}</p>
    </section>
  );
}
