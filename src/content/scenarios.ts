import breadPriceRaw from "../../scenarios/bread-price/scenario.json";
import { loadScenario } from "@/game-core";

export const breadPriceScenario = loadScenario(breadPriceRaw);

export const scenarios = [breadPriceScenario];
