import { describe, expect, test } from "vitest";
import { webAssets } from "@/platform/web/assetResolver";

describe("GitHub Pages asset resolver", () => {
  test("public配下の画像と音声へsite basePathを付与する", () => {
    expect(webAssets.image("backgrounds/street.png")).toBe("/economic-choices/images/backgrounds/street.png");
    expect(webAssets.audio("/bread-price/line-01.wav")).toBe("/economic-choices/voice/bread-price/line-01.wav");
  });

  test("キャラクター立ち絵の論理パスへもbasePathを付与する", () => {
    expect(webAssets.image("bread-price/characters/misaki/misaki_neutral.png"))
      .toBe("/economic-choices/images/bread-price/characters/misaki/misaki_neutral.png");
    expect(webAssets.image("bread-price/characters/yamada/yamada_serious.png"))
      .toBe("/economic-choices/images/bread-price/characters/yamada/yamada_serious.png");
  });
});
