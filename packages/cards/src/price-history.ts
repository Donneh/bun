import { z } from "zod";
import { type PrintingId, PrintingIdSchema } from "./card.ts";
import { PRICE_CURRENCY, PRICE_SOURCE, type PriceSnapshot, SMALLEST_PRICE } from "./price.ts";

export const PRICE_HISTORY_DAYS = 30;
const DAY_MS = 86_400_000;

const MarketSeriesSchema = z.array(z.number().min(SMALLEST_PRICE).nullable());

const PrintingHistorySchema = z.object({
  normal: MarketSeriesSchema.optional(),
  foil: MarketSeriesSchema.optional(),
});
export type PrintingHistory = z.infer<typeof PrintingHistorySchema>;
export type HistoryFinish = keyof PrintingHistory;
const FINISHES = ["normal", "foil"] as const satisfies readonly HistoryFinish[];

export const PriceHistorySchema = z
  .object({
    currency: z.literal(PRICE_CURRENCY),
    source: z.literal(PRICE_SOURCE),
    dates: z.array(z.iso.date()),
    printings: z.record(PrintingIdSchema, PrintingHistorySchema),
  })
  .superRefine((history, context) => {
    if (history.dates.some((date, index) => index > 0 && date <= (history.dates[index - 1] as string)))
      context.addIssue({ code: "custom", message: "Dates must be ascending and unique", path: ["dates"] });
    for (const [id, printing] of Object.entries(history.printings))
      for (const finish of FINISHES) {
        const series = printing[finish];
        if (series !== undefined && series.length !== history.dates.length)
          context.addIssue({
            code: "custom",
            message: "Every series needs one value per date",
            path: ["printings", id, finish],
          });
      }
  });
export type PriceHistory = z.infer<typeof PriceHistorySchema>;

export function parsePriceHistory({ json, path }: { json: unknown; path: string }): PriceHistory {
  const parsed = PriceHistorySchema.safeParse(json);
  if (parsed.success) return parsed.data;
  throw new Error(`Price history ${path} does not match the price history schema: ${z.prettifyError(parsed.error)}`);
}

type FinishAmounts = Readonly<Partial<Record<HistoryFinish, number>>>;
type DayPrices = ReadonlyMap<PrintingId, FinishAmounts>;

function finishAmounts(amountOf: (finish: HistoryFinish) => number | null | undefined): FinishAmounts | null {
  const amounts = Object.fromEntries(
    FINISHES.flatMap((finish) => {
      const amount = amountOf(finish);
      return amount === undefined || amount === null ? [] : [[finish, amount]];
    }),
  );
  return Object.keys(amounts).length > 0 ? amounts : null;
}

function dayOf<T>(
  entries: Record<string, T>,
  amountOf: (entry: T, finish: HistoryFinish) => number | null | undefined,
) {
  const day = new Map<PrintingId, FinishAmounts>();
  for (const [id, entry] of Object.entries(entries)) {
    const amounts = finishAmounts((finish) => amountOf(entry, finish));
    if (amounts !== null) day.set(PrintingIdSchema.parse(id), amounts);
  }
  return day;
}

function historyDays(history: PriceHistory | null): Map<string, DayPrices> {
  if (history === null) return new Map();
  return new Map(
    history.dates.map((date, index) => [
      date,
      dayOf(history.printings, (printing, finish) => printing[finish]?.[index]),
    ]),
  );
}

function snapshotDay(snapshot: PriceSnapshot): DayPrices {
  return dayOf(snapshot.printings, (quotes, finish) => quotes[finish]?.market);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

export function recordPriceDay(history: PriceHistory | null, snapshot: PriceSnapshot): PriceHistory {
  const days = historyDays(history);
  days.set(snapshot.updatedAt.slice(0, 10), snapshotDay(snapshot));
  const sorted = [...days.keys()].toSorted();
  const latest = sorted.at(-1) as string;
  const dates = sorted.filter((date) => daysBetween(date, latest) <= PRICE_HISTORY_DAYS);
  const ids = [...new Set(dates.flatMap((date) => [...(days.get(date) as DayPrices).keys()]))].toSorted();
  const printings = Object.fromEntries(
    ids.map((id) => {
      const printing: PrintingHistory = {};
      for (const finish of FINISHES) {
        const series = dates.map((date) => days.get(date)?.get(id)?.[finish] ?? null);
        if (series.some((amount) => amount !== null)) printing[finish] = series;
      }
      return [id, printing];
    }),
  );
  return { currency: PRICE_CURRENCY, source: PRICE_SOURCE, dates, printings };
}

export function historyOf(history: PriceHistory, printingIds: readonly PrintingId[]): PriceHistory {
  return {
    ...history,
    printings: Object.fromEntries(
      printingIds.flatMap((id) => {
        const printing = history.printings[id];
        return printing === undefined ? [] : [[id, printing]];
      }),
    ),
  };
}
