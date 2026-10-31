import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { isE2eResult, pullRequestComment } from "./pull-request-comment.ts";
import type { SavedReport } from "./verify-live.ts";

const USAGE = `Usage: bun verify-live/pull-request-comment-cli.ts --reports <reports.json> --images <url> --commit <sha> --run <url> --e2e <success|failure>

Prints the pull request comment that shows the screenshots of a verify:live run.`;

const { values } = parseArgs({
  options: {
    reports: { type: "string" },
    images: { type: "string" },
    commit: { type: "string" },
    run: { type: "string" },
    e2e: { type: "string" },
  },
  strict: true,
});
const { reports, images, commit, run, e2e } = values;
if (
  reports === undefined ||
  images === undefined ||
  commit === undefined ||
  run === undefined ||
  e2e === undefined ||
  !isE2eResult(e2e)
) {
  console.error(USAGE);
  process.exit(2);
}

const savedReports = JSON.parse(await readFile(reports, "utf8")) as SavedReport[];
process.stdout.write(
  pullRequestComment({ reports: savedReports, imageBaseUrl: images, commit, runUrl: run, e2eResult: e2e }),
);
