import { appendFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import schedules from "../schedules.json";
import { type LatestRun, type StaleWorkflow, staleWorkflows } from "../src/watchdog.ts";

async function latestDispatchedRun(workflow: string): Promise<LatestRun> {
  const gh = Bun.spawn(
    [
      "gh",
      "run",
      "list",
      "--workflow",
      workflow,
      "--event",
      "workflow_dispatch",
      "--limit",
      "1",
      "--json",
      "createdAt,url",
    ],
    { stdout: "pipe", stderr: "inherit" },
  );
  const output = await new Response(gh.stdout).text();
  if ((await gh.exited) !== 0) throw new Error(`gh run list --workflow ${workflow} failed`);
  const [run] = JSON.parse(output) as { createdAt: string; url: string }[];
  return { workflow, ...run };
}

function describe(stale: StaleWorkflow) {
  const latest = stale.createdAt ? `[${stale.createdAt}](${stale.url})` : "never";
  return `- \`${stale.workflow}\`: latest dispatched run ${latest}, expected one in the last ${stale.maxAgeMinutes} minutes`;
}

function alert(stale: StaleWorkflow[]) {
  return [
    "`riftkeeper-scheduler` has not dispatched these workflows on time:",
    "",
    ...stale.map(describe),
    "",
    "Find the cause in the Worker's logs: query Workers Observability for `$metadata.service` = `riftkeeper-scheduler`. A `401` means the dispatch token expired or was revoked: rotate it as `infrastructure/README.md` describes. A `5xx` that the Worker retried without success is an outage at GitHub.",
    "",
  ].join("\n");
}

const { values } = parseArgs({ options: { "alert-body": { type: "string" } } });
const latestRuns = await Promise.all([...new Set(Object.values(schedules))].map(latestDispatchedRun));
const stale = staleWorkflows(latestRuns, new Date());

const summary =
  stale.length === 0
    ? `## Scheduled workflows run on time\n\n${latestRuns.map((run) => `- \`${run.workflow}\`: latest dispatched run [${run.createdAt}](${run.url})`).join("\n")}\n`
    : `## Scheduled workflows stopped\n\n${alert(stale)}`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);

if (stale.length > 0) {
  if (values["alert-body"]) await writeFile(values["alert-body"], alert(stale));
  console.log(`::error title=Scheduled workflows stopped::${stale.map((run) => run.workflow).join(", ")}`);
  process.exit(1);
}
