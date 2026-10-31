import { describe, expect, test } from "bun:test";
import { PrintingIdSchema } from "@riftkeeper/cards";
import { parsePriceSnapshot } from "@riftkeeper/cards/prices";
import { makePriceSnapshot } from "@riftkeeper/cards/testing";
import type { PriceMatch } from "./match-prices.ts";
import { decidePriceUpdate, renderPriceSummary, serializePriceSnapshot } from "./price-update.ts";

const quote = { market: 0.25, low: 0.1, mid: 0.3, high: 2 };
const updatedAt = "2026-10-31T20:05:59.000Z";

const OGN_PRINTINGS = 100;
const OGS_PRINTINGS = 4;

function printingIds(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(3, "0")}`);
}

function priced({ ogn = OGN_PRINTINGS, ogs = OGS_PRINTINGS } = {}) {
  return new Map(
    [...printingIds("ogn", ogn), ...printingIds("ogs", ogs)].map((id) => [
      PrintingIdSchema.parse(id),
      { foil: quote, normal: quote },
    ]),
  );
}

function makeMatch(counts: { ogn?: number; ogs?: number } = {}): PriceMatch {
  return {
    printings: priced(counts),
    setCodeByPrinting: new Map([
      ...printingIds("ogn", OGN_PRINTINGS).map((id) => [id, "OGN"] as const),
      ...printingIds("ogs", OGS_PRINTINGS).map((id) => [id, "OGS"] as const),
      ["unl-t01", "UNL"],
    ]),
    unpricedPrintings: [{ publicCode: "UNL-T01", cardName: "Baron Pit" }],
    unmatchedProducts: [
      { productId: 3, publicCode: "UNL-T01 // T05", name: "Baron Pit // Gold", reason: "no-printing" },
    ],
  };
}

function snapshotOf(counts: { ogn?: number; ogs?: number } = {}) {
  return makePriceSnapshot({ updatedAt: "2026-10-30T20:04:00.000Z", printings: Object.fromEntries(priced(counts)) });
}

describe("decidePriceUpdate", () => {
  test("updates the prices and summarises unpriced printings and unmatched products", () => {
    const update = decidePriceUpdate({ previous: snapshotOf(), match: makeMatch({ ogn: 99 }), updatedAt });

    expect(update.kind).toBe("updated");
    expect(renderPriceSummary(update)).toBe(
      [
        "## Prices updated: 103 of 105 printings priced, TCGCSV built 2026-10-31 20:05 UTC",
        "",
        "### Printings without a price (1)",
        "",
        "- `UNL-T01` Baron Pit",
        "",
        "### TCGplayer products without a printing (1)",
        "",
        "- `UNL-T01 // T05` Baron Pit // Gold (product 3)",
        "",
      ].join("\n"),
    );
  });

  test("keeps yesterday's prices when a set loses more than 5% of its prices", () => {
    const previous = snapshotOf();

    const update = decidePriceUpdate({ previous, match: makeMatch({ ogn: 94 }), updatedAt });

    expect(update).toMatchObject({ kind: "rejected", kept: previous });
    expect(renderPriceSummary(update)).toContain("OGN lost 6 of 100 prices, above the 5% limit per set.");
    expect(renderPriceSummary(update)).toContain("Kept the prices from 2026-10-30 20:04 UTC (104 printings).");
  });

  test("keeps yesterday's prices when a small set loses its TCGCSV group", () => {
    const update = decidePriceUpdate({ previous: snapshotOf(), match: makeMatch({ ogs: 0 }), updatedAt });

    expect(update).toMatchObject({ kind: "rejected", message: "OGS lost 4 of 4 prices, above the 5% limit per set." });
  });

  test("rejects a match that prices nothing, even on the first run", () => {
    expect(decidePriceUpdate({ previous: null, match: makeMatch({ ogn: 0, ogs: 0 }), updatedAt }).kind).toBe(
      "rejected",
    );
  });

  test("reports unchanged when TCGCSV has not rebuilt since the last run", () => {
    const update = decidePriceUpdate({
      previous: snapshotOf(),
      match: makeMatch(),
      updatedAt: "2026-10-30T20:04:00.000Z",
    });

    expect(update.kind).toBe("unchanged");
  });
});

describe("renderPriceSummary", () => {
  test("says a failed fetch kept the earlier prices and shows the error", () => {
    const summary = renderPriceSummary({
      kind: "failed",
      message: "Fetching https://tcgcsv.com/tcgplayer/89/groups failed with HTTP 503",
      kept: snapshotOf({ ogn: 2, ogs: 0 }),
    });

    expect(summary).toStartWith(
      "## Prices failed: Fetching https://tcgcsv.com/tcgplayer/89/groups failed with HTTP 503",
    );
    expect(summary).toContain("Kept the prices from 2026-10-30 20:04 UTC (2 printings).");
  });
});

describe("serializePriceSnapshot", () => {
  test("writes one printing per line, sorted, normal before foil, and parses back to the same prices", () => {
    const snapshot = makePriceSnapshot({ printings: Object.fromEntries([...priced({ ogn: 2, ogs: 0 })].reverse()) });

    const text = serializePriceSnapshot(snapshot);

    expect(text.split("\n").filter((line) => line.startsWith('    "'))).toEqual([
      `    "ogn-001": ${JSON.stringify({ normal: quote, foil: quote })},`,
      `    "ogn-002": ${JSON.stringify({ normal: quote, foil: quote })}`,
    ]);
    expect(parsePriceSnapshot({ json: JSON.parse(text), path: "prices.json" })).toEqual(snapshot);
  });
});
