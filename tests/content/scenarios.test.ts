import { describe, expect, test } from "vitest";
import { scenarioCatalog, scenarios } from "@/content/scenarios";

describe("scenario catalog", () => {
  test("planned metadataを実Scenarioとしてloadしない", () => {
    const plannedEntries = scenarioCatalog.filter((entry) => entry.status === "planned");

    expect(plannedEntries.map((entry) => entry.id)).toEqual([
      "work-permit",
      "disaster-water-price",
    ]);
    expect(plannedEntries.every((entry) => !("scenario" in entry))).toBe(true);
    expect(scenarios.map((scenario) => scenario.meta.id)).toEqual(["bread-price"]);
  });
});
