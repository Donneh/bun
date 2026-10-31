import type { Card } from "@riftkeeper/cards";
import type { PriceQuote, PrintingQuotes } from "@riftkeeper/cards/prices";
import type { TcgcsvPrice, TcgcsvProduct, TcgcsvSetPrices } from "./tcgcsv.ts";

export type UnmatchedProduct = {
  readonly productId: number;
  readonly publicCode: string;
  readonly name: string;
  readonly reason: "no-printing" | "shared-number";
};

export type UnpricedPrinting = {
  readonly publicCode: string;
  readonly cardName: string;
};

export type PriceMatch = {
  readonly printings: ReadonlyMap<string, PrintingQuotes>;
  readonly setCodeByPrinting: ReadonlyMap<string, string>;
  readonly unpricedPrintings: readonly UnpricedPrinting[];
  readonly unmatchedProducts: readonly UnmatchedProduct[];
};

const FINISH_BY_SUBTYPE: Readonly<Record<string, keyof PrintingQuotes>> = { Normal: "normal", Foil: "foil" };

function productNumber(product: TcgcsvProduct): string | undefined {
  return product.extendedData.find((data) => data.name === "Number")?.value;
}

function toQuote(price: TcgcsvPrice): PriceQuote | undefined {
  const quote = { market: price.marketPrice, low: price.lowPrice, mid: price.midPrice, high: price.highPrice };
  return Object.values(quote).some((amount) => amount !== null) ? quote : undefined;
}

function quotesByProduct(prices: readonly TcgcsvPrice[]): Map<number, PrintingQuotes> {
  const quotes = new Map<number, PrintingQuotes>();
  for (const price of prices) {
    const finish = FINISH_BY_SUBTYPE[price.subTypeName];
    const quote = toQuote(price);
    if (finish === undefined || quote === undefined) continue;
    const existing = quotes.get(price.productId);
    quotes.set(price.productId, finish === "normal" ? { ...existing, normal: quote } : { ...existing, foil: quote });
  }
  return quotes;
}

function productsByPublicCode(sets: readonly TcgcsvSetPrices[]): Map<string, TcgcsvProduct[]> {
  const products = new Map<string, TcgcsvProduct[]>();
  for (const set of sets) {
    for (const product of set.products) {
      const number = productNumber(product);
      if (number === undefined) continue;
      const publicCode = `${set.setCode}-${number}`;
      products.set(publicCode, [...(products.get(publicCode) ?? []), product]);
    }
  }
  return products;
}

export function matchPrices({ cards, sets }: { cards: readonly Card[]; sets: readonly TcgcsvSetPrices[] }): PriceMatch {
  const quotes = quotesByProduct(sets.flatMap((set) => set.prices));
  const productsByCode = productsByPublicCode(sets);
  const printings = cards.flatMap((card) => card.printings.map((printing) => ({ printing, cardName: card.name })));
  const publicCodes = new Set(printings.map(({ printing }) => printing.publicCode));

  const priced = new Map<string, PrintingQuotes>();
  const unpricedPrintings: UnpricedPrinting[] = [];
  for (const { printing, cardName } of printings) {
    const [product, ...others] = productsByCode.get(printing.publicCode) ?? [];
    const printingQuotes = product === undefined || others.length > 0 ? undefined : quotes.get(product.productId);
    if (printingQuotes === undefined) unpricedPrintings.push({ publicCode: printing.publicCode, cardName });
    else priced.set(printing.id, printingQuotes);
  }

  const unmatchedProducts = [...productsByCode].flatMap(([publicCode, products]): UnmatchedProduct[] => {
    if (products.length === 1 && publicCodes.has(publicCode)) return [];
    const reason = products.length > 1 ? "shared-number" : "no-printing";
    return products.map((product) => ({ productId: product.productId, publicCode, name: product.name, reason }));
  });

  const setCodeByPrinting = new Map(printings.map(({ printing }) => [printing.id, printing.set.code]));
  return { printings: priced, setCodeByPrinting, unpricedPrintings, unmatchedProducts };
}
