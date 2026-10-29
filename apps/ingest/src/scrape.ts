import { parseArgs } from "node:util";
import { fetchGalleryHtml } from "./fetch-gallery.ts";
import { type PreviousSnapshot, runScrape } from "./run-scrape.ts";
import { describeRun, firstLine, type RunResult, renderRunSummary } from "./run-summary.ts";
import { readCardSnapshot, readCardSnapshotJson } from "./snapshot-file.ts";

const CARD_SNAPSHOT_PATH = Bun.fileURLToPath(new URL("../../api/data/cards.json", import.meta.url));

class UsageError extends Error {}

type CliOptions = {
  snapshot: string;
  report: string | undefined;
  prBody: string | undefined;
  summary: string | undefined;
  html: string | undefined;
  saveHtml: string | undefined;
  init: boolean;
  rebuild: boolean;
};

function parseCli(args: string[]): CliOptions {
  try {
    const { values } = parseArgs({
      args,
      options: {
        snapshot: { type: "string", default: CARD_SNAPSHOT_PATH },
        report: { type: "string" },
        "pr-body": { type: "string" },
        summary: { type: "string" },
        html: { type: "string" },
        "save-html": { type: "string" },
        init: { type: "boolean", default: false },
        rebuild: { type: "boolean", default: false },
      },
      strict: true,
    });
    return {
      snapshot: values.snapshot,
      report: values.report,
      prBody: values["pr-body"],
      summary: values.summary,
      html: values.html,
      saveHtml: values["save-html"],
      init: values.init,
      rebuild: values.rebuild,
    };
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
}

async function loadPrevious({
  path,
  init,
  rebuild,
}: {
  path: string;
  init: boolean;
  rebuild: boolean;
}): Promise<PreviousSnapshot> {
  if (init && rebuild) throw new UsageError("--init and --rebuild cannot be combined");
  if (init) {
    if (await Bun.file(path).exists())
      throw new UsageError(`Card snapshot ${path} already exists, so --init does not apply`);
    return { kind: "current", cards: [] };
  }
  if (rebuild) return { kind: "outdated", json: await readCardSnapshotJson(path) };
  return { kind: "current", cards: await readCardSnapshot(path) };
}

async function loadHtml({ html, saveHtml }: { html: string | undefined; saveHtml: string | undefined }) {
  if (html !== undefined && saveHtml !== undefined) throw new UsageError("--html and --save-html cannot be combined");
  if (html === undefined) {
    const fetched = await fetchGalleryHtml();
    if (saveHtml !== undefined) await Bun.write(saveHtml, fetched);
    return fetched;
  }
  const file = Bun.file(html);
  if (!(await file.exists())) throw new UsageError(`--html file ${html} does not exist`);
  return file.text();
}

async function execute(options: CliOptions): Promise<RunResult> {
  const previous = await loadPrevious({ path: options.snapshot, init: options.init, rebuild: options.rebuild });
  const html = await loadHtml({ html: options.html, saveHtml: options.saveHtml });
  const outcome = runScrape({ html, previous });

  if (outcome.kind === "changed") {
    await Bun.write(options.snapshot, `${JSON.stringify(outcome.cards, null, 2)}\n`);
    if (options.report !== undefined) await Bun.write(options.report, outcome.report);
    if (options.prBody !== undefined) await Bun.write(options.prBody, outcome.pullRequestBody);
  }
  return outcome;
}

function describeFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `Scrape failed: ${firstLine(message)}\n\n${Bun.inspect(error)}`;
}

async function main(): Promise<number> {
  const options = parseCli(Bun.argv.slice(2));
  let result: RunResult;
  try {
    result = await execute(options);
  } catch (error) {
    if (error instanceof UsageError) throw error;
    console.error(describeFailure(error));
    result = { kind: "failed", message: error instanceof Error ? error.message : String(error) };
  }
  if (options.summary !== undefined) await Bun.write(options.summary, renderRunSummary(result));
  if (result.kind === "failed") return 1;
  if (result.kind === "rejected") {
    console.error(`Scrape rejected (${result.reason}): ${result.message}`);
    return 1;
  }
  console.log(describeRun(result));
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof UsageError ? error.message : describeFailure(error));
    process.exitCode = 1;
  });
