import { describe, expect, test } from "bun:test";
import schedules from "../schedules.json";
import { maxAgeMinutesOf, staleWorkflows } from "./watchdog.ts";

const now = new Date("2026-10-30T12:00:00Z");

describe("staleWorkflows", () => {
  test("knows a maximum run age for every scheduled workflow", () => {
    for (const workflow of Object.values(schedules)) {
      expect(maxAgeMinutesOf(workflow)).toBeGreaterThan(0);
    }
  });

  test("accepts runs that are younger than their maximum age", () => {
    expect(
      staleWorkflows(
        [
          { workflow: "monitor.yml", createdAt: "2026-10-30T11:07:00Z" },
          { workflow: "scrape-cards.yml", createdAt: "2026-10-29T10:01:00Z" },
        ],
        now,
      ),
    ).toEqual([]);
  });

  test("reports a workflow whose latest run is older than its maximum age", () => {
    const run = { workflow: "monitor.yml", createdAt: "2026-10-30T10:52:00Z", url: "https://example/run" };
    expect(staleWorkflows([run], now)).toEqual([{ ...run, maxAgeMinutes: 60 }]);
  });

  test("reports a workflow that has never run", () => {
    expect(staleWorkflows([{ workflow: "scrape-cards.yml" }], now)).toEqual([
      { workflow: "scrape-cards.yml", maxAgeMinutes: 26 * 60 },
    ]);
  });

  test("rejects a workflow without a maximum age", () => {
    expect(() => staleWorkflows([{ workflow: "other.yml" }], now)).toThrow("no maximum run age for other.yml");
  });
});
