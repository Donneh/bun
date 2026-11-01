import { describe, expect, test } from "bun:test";
import { makePriceSnapshot } from "../test-support/fixtures.ts";
import { PrintingIdSchema } from "./card.ts";
import { historyOf, PRICE_HISTORY_DAYS, parsePriceHistory, recordPriceDay } from "./price-history.ts";

const ogn001 = PrintingIdSchema.parse("ogn-001-298");
const ogn002 = PrintingIdSchema.parse("ogn-002-298");

const quote = (market: number | null) => ({ market, low: 0.01, mid: 0.2, high: 5 });

type Quote = ReturnType<typeof quote>;

function snapshotOn(date: string, printings: Record<string, { normal?: Quote; foil?: Quote }>) {
  return makePriceSnapshot({ updatedAt: `${date}T20:05:59.000Z`, printings });
}

function isoDate(start: string, offset: number) {
  return new Date(Date.parse(start) + offset * 86_400_000).toISOString().slice(0, 10);
}

describe("recordPriceDay", () => {
  test("starts a history with the market price per finish on the date TCGCSV built the prices", () => {
    const history = recordPriceDay(
      null,
      snapshotOn("2026-10-31", { [ogn001]: { normal: quote(0.1), foil: quote(0.19) } }),
    );

    expect(history.dates).toEqual(["2026-10-31"]);
    expect(history.printings).toEqual({ [ogn001]: { normal: [0.1], foil: [0.19] } });
  });

  test("leaves a gap for a missed day and for a printing or finish without a market price that day", () => {
    let history = recordPriceDay(null, snapshotOn("2026-10-01", { [ogn001]: { normal: quote(1), foil: quote(2) } }));
    history = recordPriceDay(
      history,
      snapshotOn("2026-10-03", { [ogn001]: { normal: quote(null), foil: quote(2.5) }, [ogn002]: { foil: quote(4) } }),
    );

    expect(history.dates).toEqual(["2026-10-01", "2026-10-03"]);
    expect(history.printings).toEqual({
      [ogn001]: { normal: [1, null], foil: [2, 2.5] },
      [ogn002]: { foil: [null, 4] },
    });
  });

  test("records the same build twice as one day", () => {
    const snapshot = snapshotOn("2026-10-01", { [ogn001]: { normal: quote(1) } });

    expect(recordPriceDay(recordPriceDay(null, snapshot), snapshot)).toEqual(recordPriceDay(null, snapshot));
  });

  test(`keeps the last ${PRICE_HISTORY_DAYS} days before the newest date and drops printings left without prices`, () => {
    let history = recordPriceDay(null, snapshotOn("2026-09-01", { [ogn002]: { normal: quote(9) } }));
    for (let day = 1; day <= 40; day += 1)
      history = recordPriceDay(history, snapshotOn(isoDate("2026-09-01", day), { [ogn001]: { normal: quote(day) } }));

    expect(history.dates).toHaveLength(PRICE_HISTORY_DAYS + 1);
    expect(history.dates.at(0)).toBe(isoDate("2026-09-01", 40 - PRICE_HISTORY_DAYS));
    expect(history.dates.at(-1)).toBe(isoDate("2026-09-01", 40));
    expect(Object.keys(history.printings)).toEqual([ogn001]);
    expect(history.printings[ogn001]?.normal?.at(-1)).toBe(40);
  });

  test("writes a history that parses back unchanged", () => {
    const history = recordPriceDay(null, snapshotOn("2026-10-01", { [ogn001]: { foil: quote(3) } }));

    expect(parsePriceHistory({ json: JSON.parse(JSON.stringify(history)), path: "price-history.json" })).toEqual(
      history,
    );
  });
});

describe("parsePriceHistory", () => {
  const valid = { currency: "USD", source: "TCGplayer via TCGCSV", dates: ["2026-10-01", "2026-10-02"], printings: {} };

  test("rejects a series without one value per date", () => {
    expect(() =>
      parsePriceHistory({ json: { ...valid, printings: { [ogn001]: { normal: [1] } } }, path: "price-history.json" }),
    ).toThrow("Every series needs one value per date");
  });

  test("rejects dates out of order", () => {
    expect(() =>
      parsePriceHistory({ json: { ...valid, dates: ["2026-10-02", "2026-10-01"] }, path: "price-history.json" }),
    ).toThrow("Dates must be ascending and unique");
  });
});

describe("historyOf", () => {
  test("keeps only the requested printings that have a history", () => {
    const history = recordPriceDay(
      null,
      snapshotOn("2026-10-01", { [ogn001]: { normal: quote(1) }, [ogn002]: { normal: quote(2) } }),
    );

    expect(historyOf(history, [ogn002, PrintingIdSchema.parse("unl-t01")]).printings).toEqual({
      [ogn002]: { normal: [2] },
    });
  });
});
