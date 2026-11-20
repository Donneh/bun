import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { parseRulesSnapshot } from "@riftkeeper/cards/rules";
import { articleKind, buildRules, RulesOverridesSchema } from "./build-rules.ts";
import { absoluteUrl, fetchPage, readArticle, readArticleLinks } from "./riot-article.ts";
import { rulesUpdate } from "./rules-update.ts";
import { readCardSnapshot } from "./snapshot-file.ts";

const DATA = new URL("../../api/data/", import.meta.url);
const { values: options } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    cards: { type: "string", default: Bun.fileURLToPath(new URL("cards.json", DATA)) },
    snapshot: { type: "string", default: Bun.fileURLToPath(new URL("rules.json", DATA)) },
    overrides: { type: "string", default: Bun.fileURLToPath(new URL("rules-overrides.json", import.meta.url)) },
    summary: { type: "string" },
    "pr-body": { type: "string" },
    result: { type: "string" },
    pages: { type: "string" },
    "save-pages": { type: "string" },
  },
  strict: true,
});

async function page(url: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.origin !== "https://playriftbound.com" || !parsed.pathname.startsWith("/en-us/"))
    throw new Error(`Refusing non-English or non-Riot source ${url}`);
  const filename = `${parsed.pathname.replaceAll("/", "_")}.html`;
  if (options.pages !== undefined) return Bun.file(join(options.pages, filename)).text();
  const html = await fetchPage(url);
  if (options["save-pages"] !== undefined) {
    await mkdir(options["save-pages"], { recursive: true });
    await Bun.write(join(options["save-pages"], filename), html);
  }
  return html;
}

async function run(): Promise<void> {
  if (options.pages !== undefined && options["save-pages"] !== undefined)
    throw new Error("--pages and --save-pages cannot be combined");
  const file = Bun.file(options.snapshot);
  const previous = (await file.exists())
    ? parseRulesSnapshot({ json: await file.json(), path: options.snapshot })
    : null;
  const overrides = RulesOverridesSchema.parse(await Bun.file(options.overrides).json());
  const urls = new Set(previous?.sources.map((source) => source.url).filter((url) => !url.endsWith("/rules-hub")));
  for (const category of ["announcements", "rules-and-releases"]) {
    const links = readArticleLinks(await page(absoluteUrl(`/en-us/news/${category}`)));
    if (links.length === 0) throw new Error(`No articles found in ${category}`);
    for (const link of links) if (articleKind(link.title) !== null) urls.add(link.url);
  }
  const articles = [];
  for (const url of [...urls].sort()) {
    if (overrides.excludedSources[url] !== undefined) continue;
    articles.push(readArticle({ url, html: await page(url) }));
  }
  const hubUrl = absoluteUrl("/en-us/rules-hub");
  const result = buildRules({
    cards: await readCardSnapshot(options.cards),
    articles,
    overrides,
    hub: readArticle({ url: hubUrl, html: await page(hubUrl) }),
  });
  const decision = rulesUpdate({
    previous,
    next: result.snapshot,
    warnings: result.warnings,
    excludedSources: overrides.excludedSources,
  });
  const text = `${JSON.stringify(result.snapshot, null, 2)}\n`;
  const { changed, autoMerge } = decision;
  const { bans, errata, rulings, sources } = result.snapshot;
  const description = `${changed ? "updated" : "unchanged"}: ${sources.length} sources, ${bans.length} format bans, ${errata.length} errata, ${rulings.length} FAQ answers, ${result.warnings.length} warnings`;
  const summary = [
    `## Rules ingest ${description}`,
    "",
    "Source: Riot's English Rules Hub, ban announcements, errata and set FAQs.",
    "",
    `Auto-merge: ${autoMerge ? "eligible after checks" : "disabled; review required"}.`,
    "",
    "Review new or edited FAQ card associations and source text before merging. FAQ answers retain Riot's symbol notation because a question can cover multiple cards.",
    "",
    ...result.warnings.map((warning) => `- ${warning}`),
    "",
    ...sources.map((source) => `- [${source.title}](${source.url}) (${source.publishedAt})`),
    "",
  ].join("\n");
  if (changed) {
    await Bun.write(options.snapshot, text);
    if (options["pr-body"] !== undefined) await Bun.write(options["pr-body"], summary);
  }
  if (options.summary !== undefined) await Bun.write(options.summary, summary);
  if (options.result !== undefined) await Bun.write(options.result, `${JSON.stringify(decision)}\n`);
  console.log(description);
  for (const warning of result.warnings) console.warn(warning);
}

try {
  await run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Rules ingest failed: ${message}`);
  if (options.summary !== undefined) await Bun.write(options.summary, `## Rules ingest failed\n\n${message}\n`);
  process.exitCode = 1;
}
