import { describe, expect, test } from "bun:test";
import { type DeployRun, monitorTarget } from "./monitor-target.ts";

const now = new Date("2026-10-30T16:00:00Z");

function run(overrides: Partial<DeployRun>): DeployRun {
  return {
    status: "completed",
    conclusion: "success",
    startedAt: "2026-10-30T15:00:00Z",
    updatedAt: "2026-10-30T15:03:00Z",
    headSha: "sha",
    url: "https://github.com/Donneh/bun/actions/runs/1",
    ...overrides,
  };
}

describe("monitorTarget", () => {
  test("skips while a deploy that started recently is running", () => {
    const deploying = run({ status: "in_progress", conclusion: "", startedAt: "2026-10-30T15:55:00Z" });
    expect(monitorTarget([deploying, run({ headSha: "live" })], now, "main")).toEqual({
      kind: "deploying",
      deploy: deploying,
    });
  });

  test("tests production when a deploy has run for longer than the limit", () => {
    const stuck = run({ status: "waiting", conclusion: "", startedAt: "2026-10-30T15:29:00Z", headSha: "stuck" });
    expect(monitorTarget([stuck, run({ headSha: "live" })], now, "main")).toEqual({ kind: "live", sha: "live" });
  });

  test("tests the commit of the deploy that succeeded last", () => {
    const runs = [
      run({ headSha: "rolled-back", conclusion: "failure", updatedAt: "2026-10-30T15:50:00Z" }),
      run({ headSha: "older", updatedAt: "2026-10-30T14:00:00Z" }),
      run({ headSha: "rerun-of-older", updatedAt: "2026-10-30T15:40:00Z" }),
      run({ headSha: "newer-commit", updatedAt: "2026-10-30T15:10:00Z" }),
    ];
    expect(monitorTarget(runs, now, "main")).toEqual({ kind: "live", sha: "rerun-of-older" });
  });

  test("falls back to the given commit when no deploy succeeded", () => {
    expect(monitorTarget([run({ conclusion: "failure" })], now, "main")).toEqual({ kind: "unknown", sha: "main" });
  });
});
