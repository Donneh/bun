import { describe, expect, test } from "bun:test";
import { liveVersions, type State } from "./live-versions.ts";

const workers = ["riftkeeper-api", "riftkeeper-web"];

function deployment(script_name: string, versions: [string, number][], deposed_key?: string) {
  return {
    type: "cloudflare_workers_deployment",
    ...(deposed_key ? { deposed_key } : {}),
    values: { script_name, versions: versions.map(([version_id, percentage]) => ({ version_id, percentage })) },
  };
}

function state(...resources: ReturnType<typeof deployment>[]): State {
  return { values: { root_module: { child_modules: resources.map((resource) => ({ resources: [resource] })) } } };
}

describe("liveVersions", () => {
  test("picks the version that serves most traffic for each Worker", () => {
    const staged = state(
      deployment("riftkeeper-api", [
        ["new", 0.01],
        ["live", 99.99],
      ]),
      deployment("riftkeeper-web", [["web-live", 100]]),
    );
    expect(liveVersions(staged, workers)).toEqual({ "riftkeeper-api": "live", "riftkeeper-web": "web-live" });
  });

  test("ignores a deposed deployment", () => {
    const withDeposed = state(
      deployment("riftkeeper-api", [["live", 100]]),
      deployment("riftkeeper-api", [["rejected", 100]], "00000001"),
      deployment("riftkeeper-web", [["web-live", 100]]),
    );
    expect(liveVersions(withDeposed, workers)).toEqual({ "riftkeeper-api": "live", "riftkeeper-web": "web-live" });
  });

  test("returns only the requested Workers", () => {
    const withScheduler = state(
      deployment("riftkeeper-api", [["live", 100]]),
      deployment("riftkeeper-web", [["web-live", 100]]),
      deployment("riftkeeper-scheduler", [["scheduler-live", 100]]),
    );
    expect(liveVersions(withScheduler, workers)).toEqual({ "riftkeeper-api": "live", "riftkeeper-web": "web-live" });
  });

  test("refuses a state without a live version for every Worker", () => {
    expect(() => liveVersions({}, workers)).toThrow("riftkeeper-api, riftkeeper-web");
    expect(() => liveVersions(state(deployment("riftkeeper-api", [["live", 100]])), workers)).toThrow(
      "no live version for riftkeeper-web.",
    );
  });

  test("allows missing Workers when bootstrapping", () => {
    expect(liveVersions({}, workers, { bootstrap: true })).toEqual({});
  });
});
