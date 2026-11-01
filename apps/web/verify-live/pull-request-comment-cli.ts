import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { isE2eResult, pullRequestComment, shownImages } from "./pull-request-comment.ts";
import { NO_REQUESTED_PATHS, type RequestedPaths } from "./screenshot-request.ts";
import type { SavedReport } from "./verify-live.ts";

const USAGE = `Usage: bun verify-live/pull-request-comment-cli.ts --reports <reports.json> [--requested <requested-paths.json>] [--image-list <file>] --images <url> --commit <sha> --run <url> --e2e <success|failure>

Prints the pull request comment that shows the screenshots of a verify:live run.
--image-list writes the file name of every image the comment shows, one per line.`;

const { values } = parseArgs({
  options: {
    reports: { type: "string" },
    requested: { type: "string" },
    "image-list": { type: "string" },
    images: { type: "string" },
    commit: { type: "string" },
    run: { type: "string" },
    e2e: { type: "string" },
  },
  strict: true,
});
const { reports, requested, "image-list": imageList, images, commit, run, e2e } = values;
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
const requestedPaths =
  requested === undefined ? NO_REQUESTED_PATHS : (JSON.parse(await readFile(requested, "utf8")) as RequestedPaths);
if (imageList !== undefined)
  await writeFile(imageList, `${shownImages({ reports: savedReports, requested: requestedPaths }).join("\n")}\n`);
process.stdout.write(
  pullRequestComment({
    reports: savedReports,
    imageBaseUrl: images,
    commit,
    runUrl: run,
    e2eResult: e2e,
    requested: requestedPaths,
  }),
);
