import { appendFile } from "node:fs/promises";

export type DeployRun = {
  status: string;
  conclusion: string;
  startedAt: string;
  updatedAt: string;
  headSha: string;
  url: string;
};

export type MonitorTarget =
  | { kind: "deploying"; deploy: DeployRun }
  | { kind: "live"; sha: string }
  | { kind: "unknown"; sha: string };

export const deploySkipLimitMs = 30 * 60 * 1000;

export function monitorTarget(runs: DeployRun[], now: Date, fallbackSha: string): MonitorTarget {
  const deploy = runs.find(
    (run) => run.status !== "completed" && now.getTime() - Date.parse(run.startedAt) < deploySkipLimitMs,
  );
  if (deploy) return { kind: "deploying", deploy };

  const lastDeployed = runs
    .filter((run) => run.conclusion === "success")
    .reduce<DeployRun | undefined>(
      (latest, run) => (latest === undefined || run.updatedAt > latest.updatedAt ? run : latest),
      undefined,
    );
  return lastDeployed ? { kind: "live", sha: lastDeployed.headSha } : { kind: "unknown", sha: fallbackSha };
}

function report(target: MonitorTarget) {
  const limitMinutes = deploySkipLimitMs / 60_000;
  switch (target.kind) {
    case "deploying":
      return {
        annotation: `::notice title=Skipped during a deploy::Deploy run ${target.deploy.url} is changing production, so this run does not test it.`,
        summary: `## Skipped: a deploy is changing production\n\n[This Deploy run](${target.deploy.url}) started less than ${limitMinutes} minutes ago and is still running. It tests production itself and rolls back on failure. The next Monitor run tests production again. A Deploy run that runs longer than ${limitMinutes} minutes no longer skips Monitor.\n`,
        outputs: { deploying: "true", sha: "" },
      };
    case "live":
      return {
        annotation: `::notice title=Testing the live commit::${target.sha}`,
        summary: `## Testing the live commit\n\nProduction runs ${target.sha}, the commit of the latest successful Deploy run on main. This run tests production with that commit's tests.\n`,
        outputs: { deploying: "false", sha: target.sha },
      };
    case "unknown":
      return {
        annotation: `::warning title=No successful deploy found::No recent Deploy run on main succeeded, so this run tests production with the tests of ${target.sha}.`,
        summary: `## Testing ${target.sha}\n\nNo recent Deploy run on main succeeded, so the live commit is unknown. This run tests production with the tests of ${target.sha}.\n`,
        outputs: { deploying: "false", sha: target.sha },
      };
  }
}

if (import.meta.main) {
  const { GITHUB_OUTPUT, GITHUB_STEP_SUMMARY, GITHUB_SHA } = process.env;
  if (!GITHUB_OUTPUT || !GITHUB_STEP_SUMMARY || !GITHUB_SHA) {
    throw new Error("Run this in GitHub Actions: GITHUB_OUTPUT, GITHUB_STEP_SUMMARY and GITHUB_SHA must be set.");
  }
  const runs = (await Bun.stdin.json()) as DeployRun[];
  const { annotation, summary, outputs } = report(monitorTarget(runs, new Date(), GITHUB_SHA));
  console.log(annotation);
  await appendFile(GITHUB_STEP_SUMMARY, summary);
  await appendFile(
    GITHUB_OUTPUT,
    Object.entries(outputs)
      .map(([name, value]) => `${name}=${value}\n`)
      .join(""),
  );
}
