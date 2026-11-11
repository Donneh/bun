import { describe, expect, test } from "bun:test";
import { type PricedPrinting, withPrices } from "@riftkeeper/cards/prices";
import { makeCard, makePriceHistory, makePriceSnapshot, makePrinting } from "@riftkeeper/cards/testing";
import { cardInfo } from "../app/utils/card-detail.ts";

const quote = (market: number) => ({ market, low: null, mid: null, high: null });
const [card] = withPrices(
  [makeCard({ id: "ahri", printings: [makePrinting({ id: "ogn-119-298" })] })],
  makePriceSnapshot({ printings: { "ogn-119-298": { normal: quote(1.5), foil: quote(8) } } }),
);
const priced = card as NonNullable<typeof card>;
const printing = priced.printings[0] as PricedPrinting;

function datesUntil(latest: string, days: number) {
  return Array.from({ length: days }, (_, index) =>
    new Date(Date.parse(latest) - (days - 1 - index) * 86_400_000).toISOString().slice(0, 10),
  );
}

function trends(dates: string[], normal: (number | null)[], foil?: (number | null)[]) {
  const history = makePriceHistory({ dates, printings: { "ogn-119-298": foil ? { normal, foil } : { normal } } });
  return cardInfo(priced, printing, history).pricing?.finishes.map((finish) => finish.trend);
}

describe("price trend", () => {
  test("shows the change and a value per day over the last 30 days, with a gap for a missed day", () => {
    const dates = datesUntil("2026-11-30", 31).filter((_, index) => index !== 10);
    const normal = dates.map((_, index) => (index === dates.length - 1 ? 1.5 : 1.2));
    const foil = dates.map((_, index) => (index === 0 ? 10 : 8));

    const [normalTrend, foilTrend] = trends(dates, normal, foil) ?? [];

    expect(normalTrend).toMatchObject({ change: "▲ 25%", period: "30 days", description: "Up 25% in 30 days" });
    expect(normalTrend?.values).toHaveLength(31);
    expect(normalTrend?.values[10]).toBeNull();
    expect(normalTrend?.values.at(-1)).toBe(1.5);
    expect(foilTrend).toMatchObject({ change: "▼ 20%", description: "Down 20% in 30 days" });
  });

  test("needs at least 7 days with a price", () => {
    const dates = datesUntil("2026-11-30", 8);

    expect(trends(dates, [null, null, 1, 1, 1, 1, 1, 1.5])).toEqual([undefined, undefined]);
    expect(trends(dates, [null, 1, 1, 1, 1, 1, 1, 1.5])?.[0]).toMatchObject({ change: "▲ 50%", period: "6 days" });
  });

  test("shows no trend when the newest day has no price for the finish", () => {
    const dates = datesUntil("2026-11-30", 10);

    expect(trends(dates, [...Array(9).fill(1), null])?.[0]).toBeUndefined();
  });

  test("says unchanged when the price did not move", () => {
    const dates = datesUntil("2026-11-30", 7);

    expect(trends(dates, Array(7).fill(1.5))?.[0]).toMatchObject({ change: "0%", description: "Unchanged in 6 days" });
  });

  test("shows no trend without a history", () => {
    expect(cardInfo(priced, printing).pricing?.finishes.every((finish) => finish.trend === undefined)).toBe(true);
  });
});
