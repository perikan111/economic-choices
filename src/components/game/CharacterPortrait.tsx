import Image from "next/image";
import type { SpeakerView } from "@/game-core";
import { webAssets } from "@/platform/web/assetResolver";

interface CharacterPortraitProps {
  speaker: SpeakerView;
}

export function CharacterPortrait({ speaker }: CharacterPortraitProps) {
  if (!speaker.portrait) return null;

  return (
    <div
      className="character-portrait-slot"
      data-image-id={speaker.portrait.imageId}
      data-expression={speaker.portrait.expression}
    >
      <Image
        alt=""
        className="character-portrait-image"
        draggable={false}
        height={1040}
        loading="eager"
        src={webAssets.image(speaker.portrait.logicalPath)}
        unoptimized
        width={384}
      />
    </div>
  );
}
