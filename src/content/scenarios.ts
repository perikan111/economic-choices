import breadPriceRaw from "../../scenarios/bread-price/scenario.json";
import { loadScenario, type Scenario } from "@/game-core";

export const breadPriceScenario = loadScenario(breadPriceRaw);

interface ScenarioCatalogBase {
  id: string;
  number: number;
  title: string;
  summary: string;
  description: string;
  estimatedMinutes?: number;
}

export interface PlayableScenarioCatalogEntry extends ScenarioCatalogBase {
  status: "playable";
  scenario: Scenario;
}

export interface PlannedScenarioCatalogEntry extends ScenarioCatalogBase {
  status: "planned";
}

export type ScenarioCatalogEntry =
  | PlayableScenarioCatalogEntry
  | PlannedScenarioCatalogEntry;

export const scenarioCatalog = [
  {
    id: breadPriceScenario.meta.id,
    number: 1,
    title: breadPriceScenario.meta.title,
    summary: breadPriceScenario.meta.summary ?? "",
    description: "小麦不足でパン価格が高騰した街。あなたは市長として、価格・供給・生活・財政の間で判断します。",
    estimatedMinutes: breadPriceScenario.meta.estimatedMinutes,
    status: "playable",
    scenario: breadPriceScenario,
  },
  {
    id: "work-permit",
    number: 2,
    title: "許可証がなければ働けません",
    summary: "働きたい人、仕事を守りたい人、安全を守る制度。",
    description: "「誰がその仕事をしてよいか」を決めるルールを扱う予定です。",
    status: "planned",
  },
  {
    id: "disaster-water-price",
    number: 3,
    title: "災害の日、1000円の水",
    summary: "災害で物資が足りないとき、価格の上昇をどこまで認めるのか。",
    description: "非常時の価格・供給・公平を扱う予定です。",
    status: "planned",
  },
] satisfies readonly ScenarioCatalogEntry[];

export const scenarios: Scenario[] = scenarioCatalog.flatMap((entry) =>
  entry.status === "playable" ? [entry.scenario] : [],
);
