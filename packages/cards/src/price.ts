import { z } from "zod";
import { type Card, CardSchema, type PrintingId, PrintingIdSchema, PrintingSchema } from "./card.ts";

export const PRICE_CURRENCY = "USD";
export const PRICE_SOURCE = "TCGplayer via TCGCSV";

const AmountSchema = z.number().nonnegative().nullable();

export const PriceQuoteSchema = z.object({
  market: AmountSchema,
  low: AmountSchema,
  mid: AmountSchema,
  high: AmountSchema,
});
export type PriceQuote = z.infer<typeof PriceQuoteSchema>;

const FinishQuotesSchema = z.object({
  normal: PriceQuoteSchema.optional(),
  foil: PriceQuoteSchema.optional(),
});

const hasAQuote = (quotes: z.infer<typeof FinishQuotesSchema>) =>
  quotes.normal !== undefined || quotes.foil !== undefined;
const NO_QUOTE_MESSAGE = "A priced printing needs a normal or a foil quote";

export const PrintingQuotesSchema = FinishQuotesSchema.refine(hasAQuote, NO_QUOTE_MESSAGE);
export type PrintingQuotes = z.infer<typeof PrintingQuotesSchema>;

const PriceOriginSchema = z.object({
  currency: z.literal(PRICE_CURRENCY),
  source: z.literal(PRICE_SOURCE),
  updatedAt: z.iso.datetime(),
});

export const PriceSnapshotSchema = PriceOriginSchema.extend({
  printings: z.record(PrintingIdSchema, PrintingQuotesSchema),
});
export type PriceSnapshot = z.infer<typeof PriceSnapshotSchema>;

export const PrintingPricesSchema = FinishQuotesSchema.extend(PriceOriginSchema.shape).refine(
  hasAQuote,
  NO_QUOTE_MESSAGE,
);
export type PrintingPrices = z.infer<typeof PrintingPricesSchema>;

export const PricedPrintingSchema = PrintingSchema.extend({ prices: PrintingPricesSchema.nullable() });
export type PricedPrinting = z.infer<typeof PricedPrintingSchema>;

export const PricedCardSchema = CardSchema.extend({ printings: z.array(PricedPrintingSchema).min(1) });
export type PricedCard = z.infer<typeof PricedCardSchema>;

export function parsePriceSnapshot({ json, path }: { json: unknown; path: string }): PriceSnapshot {
  const parsed = PriceSnapshotSchema.safeParse(json);
  if (parsed.success) return parsed.data;
  throw new Error(`Price snapshot ${path} does not match the price schema: ${z.prettifyError(parsed.error)}`);
}

export function pricesFor(snapshot: PriceSnapshot, printingId: PrintingId): PrintingPrices | null {
  const quotes = snapshot.printings[printingId];
  if (quotes === undefined) return null;
  return { ...quotes, currency: snapshot.currency, source: snapshot.source, updatedAt: snapshot.updatedAt };
}

export function withPrices(cards: readonly Card[], snapshot: PriceSnapshot): PricedCard[] {
  return cards.map((card) => ({
    ...card,
    printings: card.printings.map((printing) => ({ ...printing, prices: pricesFor(snapshot, printing.id) })),
  }));
}
