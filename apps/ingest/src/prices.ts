import { parseArgs } from "node:util";
import { type PriceSnapshot, parsePriceSnapshot } from "@riftkeeper/cards/prices";
import { matchPrices } from "./match-prices.ts";
import {
  decidePriceUpdate,
  describePriceUpdate,
  type PriceUpdate,
  renderPriceSummary,
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
const summary = renderPriceSummary(result);
if (options.summary !== undefined) await Bun.write(options.summary, summary);
if (options["pr-body"] !== undefined && result.kind === "updated") await Bun.write(options["pr-body"], summary);

const description = describePriceUpdate(result);
if (result.kind === "failed" || result.kind === "rejected") {
  console.error(description);
  process.exitCode = 1;
} else {
  console.log(description);
}
