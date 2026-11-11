import { parseArgs } from "node:util";
import { parsePriceHistory } from "@riftkeeper/cards/price-history";
import { type PriceSnapshot, parsePriceSnapshot } from "@riftkeeper/cards/prices";
import { matchPrices } from "./match-prices.ts";
import {
  decideHistoryUpdate,
  decidePriceUpdate,
  describeHistoryUpdate,
  describePriceUpdate,
  type PriceUpdate,
  renderPriceSummary,
  serializePriceHistory,
  serializePriceSnapshot,
} from "./price-update.ts";
import { readCardSnapshot } from "./snapshot-file.ts";
import { fetchTcgcsvCatalog } from "./tcgcsv.ts";

const DATA_DIRECTORY = new URL("../../api/data/", import.meta.url);

const { values: options } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    cards: { type: "string", default: Bun.fileURLToPath(new URL("cards.json", DATA_DIRECTORY)) },
    prices: { type: "string", default: Bun.fileURLToPath(new URL("prices.json", DATA_DIRECTORY)) },
    history: { type: "string", default: Bun.fileURLToPath(new URL("price-history.json", DATA_DIRECTORY)) },
    summary: { type: "string" },
    "pr-body": { type: "string" },
  },
  strict: true,
});

async function readPreviousPrices(path: string): Promise<PriceSnapshot | null> {
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  return parsePriceSnapshot({ json: await file.json(), path });
}

async function update(): Promise<PriceUpdate> {
  let previous: PriceSnapshot | null = null;
  try {
    previous = await readPreviousPrices(options.prices);
    const cards = await readCardSnapshot(options.cards);
    const setCodes = [...new Set(cards.flatMap((card) => card.printings.map((printing) => printing.set.code)))];
    const catalog = await fetchTcgcsvCatalog({ setCodes });
    const match = matchPrices({ cards, sets: catalog.sets });
    return decidePriceUpdate({ previous, match, updatedAt: catalog.updatedAt });
  } catch (error) {
    return { kind: "failed", message: error instanceof Error ? error.message : String(error), kept: previous };
  }
}

const result = await update();
if (result.kind === "updated") await Bun.write(options.prices, serializePriceSnapshot(result.snapshot));

const historyFile = Bun.file(options.history);
const historyText = (await historyFile.exists()) ? await historyFile.text() : null;
const history = decideHistoryUpdate({
  update: result,
  readPrevious: () =>
    historyText === null ? null : parsePriceHistory({ json: JSON.parse(historyText), path: options.history }),
});
if (history?.kind === "recorded") await Bun.write(options.history, serializePriceHistory(history.history));

const historyLine = history === null ? [] : [describeHistoryUpdate(history), ""];
const summary = [renderPriceSummary(result), ...historyLine].join("\n");
if (options.summary !== undefined) await Bun.write(options.summary, summary);
const changed = result.kind === "updated" || history?.kind === "recorded";
if (options["pr-body"] !== undefined && changed) await Bun.write(options["pr-body"], summary);

const description = describePriceUpdate(result);
if (result.kind === "failed" || result.kind === "rejected") {
  console.error(description);
  process.exitCode = 1;
} else {
  console.log(description);
}
if (history?.kind === "failed") console.error(describeHistoryUpdate(history));
else if (history !== null) console.log(describeHistoryUpdate(history));
