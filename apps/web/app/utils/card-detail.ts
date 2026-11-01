import type { Card, Domain, PrintingId, Variant } from "@riftkeeper/cards";
import type { HistoryFinish, PriceHistory } from "@riftkeeper/cards/price-history";
import type { PricedCard, PricedPrinting, PriceQuote, PrintingPrices } from "@riftkeeper/cards/prices";
import type {
  CardInfoContent,
  CardStat,
  GlyphName,
  GlyphTextPart,
  PriceFigure,
  PriceTrend,
  PricingContent,
  PrintingSummary,
} from "@riftkeeper/ui";
import { isGlyphName } from "@riftkeeper/ui/glyph";
import { responsiveImage } from "./card-images.ts";

const VARIANT_LABELS: Record<Variant, string> = {
  standard: "Standard",
  "alt-art": "Alt art",
  signed: "Signed",
  special: "Special",
  token: "Token",
  rune: "Rune",
};

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

export function cardHref(id: string): string {
  return `/cards/${encodeURIComponent(id)}`;
}

export function searchHref(query: string): string {
  return `/?q=${encodeURIComponent(query)}`;
}

function quotedValue(value: string): string {
  return /[\s"\\()]/.test(value) ? `"${value.replace(/["\\]/g, "\\$&")}"` : value;
}

export function domainGlyph(domain: Domain): GlyphName {
  return domain === "colorless" ? "colorless" : `rune_${domain}`;
}

const labelled = (name: GlyphName, value: string): GlyphTextPart[] => [
  { kind: "glyph", name, decorative: true },
  { kind: "text", text: value },
];

function kicker(card: Card): GlyphTextPart[][] {
  const typeWords = [card.supertype, card.type]
    .filter((word): word is NonNullable<typeof word> => word !== null)
    .map(capitalize)
    .join(" ");
  const domains = card.domains.map((domain) => labelled(domainGlyph(domain), capitalize(domain)));
  if (!typeWords) return domains;
  return [
    ...domains,
    card.type === null ? [{ kind: "text", text: typeWords }] : labelled(`card_type_${card.type}`, typeWords),
  ];
}

function powerGlyph(domains: readonly Domain[]): GlyphName | undefined {
  const [domain] = domains;
  return domains.length === 1 && domain !== undefined && domain !== "colorless" ? domainGlyph(domain) : undefined;
}

const stat = (label: string, value: string, glyph: GlyphName | undefined, valueShown = true): CardStat =>
  glyph === undefined ? { label, value, valueShown: true } : { label, value, glyph, valueShown };

function energyStat(energy: number): CardStat {
  const glyph = `energy_${energy}`;
  return isGlyphName(glyph) ? stat("Energy", String(energy), glyph, false) : stat("Energy", String(energy), undefined);
}

function mightStat(might: number | null, bonus: number | null): CardStat | null {
  if (might !== null) return stat("Might", bonus === null ? String(might) : `${might} +${bonus}`, "might");
  return bonus === null ? null : stat("Might bonus", `+${bonus}`, "might");
}

function stats(card: Card): CardStat[] {
  return [
    card.energyCost === null ? null : energyStat(card.energyCost),
    card.powerCost === null ? null : stat("Power", String(card.powerCost), powerGlyph(card.domains)),
    mightStat(card.might, card.mightBonus),
  ].filter((entry): entry is CardStat => entry !== null);
}

const FINISHES = [
  { key: "normal", label: "Normal" },
  { key: "foil", label: "Foil" },
] as const;

const PRICE_DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const TREND_DAYS = 30;
const MIN_TREND_DAYS = 7;
const DAY_MS = 86_400_000;
const PERCENT = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

function finishQuotes(prices: PrintingPrices): { key: HistoryFinish; finish: string; quote: PriceQuote }[] {
  return FINISHES.flatMap(({ key, label }) => {
    const quote = prices[key];
    return quote === undefined ? [] : [{ key, finish: label, quote }];
  });
}

const daysBefore = (date: string, latest: string) => Math.round((Date.parse(latest) - Date.parse(date)) / DAY_MS);

function describeChange(change: number, period: string): Pick<PriceTrend, "change" | "description"> {
  const percent = PERCENT.format(Math.abs(change));
  if (percent === PERCENT.format(0)) return { change: percent, description: `Unchanged in ${period}` };
  return change > 0
    ? { change: `▲ ${percent}`, description: `Up ${percent} in ${period}` }
    : { change: `▼ ${percent}`, description: `Down ${percent} in ${period}` };
}

function priceTrend(history: PriceHistory, printingId: PrintingId, finish: HistoryFinish): PriceTrend | undefined {
  const series = history.printings[printingId]?.[finish];
  const latest = history.dates.at(-1);
  if (series === undefined || latest === undefined || series.at(-1) == null) return undefined;
  const byDaysBefore = new Map(
    history.dates.flatMap((date, index) => {
      const amount = series[index];
      const age = daysBefore(date, latest);
      return amount == null || age > TREND_DAYS ? [] : [[age, amount] as const];
    }),
  );
  if (byDaysBefore.size < MIN_TREND_DAYS) return undefined;
  const span = Math.max(...byDaysBefore.keys());
  const first = byDaysBefore.get(span) as number;
  const last = byDaysBefore.get(0) as number;
  const period = `${span} days`;
  return {
    ...describeChange((last - first) / first, period),
    period,
    values: Array.from({ length: span + 1 }, (_, day) => byDaysBefore.get(span - day) ?? null),
  };
}

type Money = (amount: number) => string;

function moneyFormat(currency: string): Money {
  const format = new Intl.NumberFormat("en-US", { style: "currency", currency });
  return (amount) => format.format(amount);
}

function figure(label: string, amount: number | null, money: Money): PriceFigure[] {
  return amount === null ? [] : [{ label, amount: money(amount) }];
}

function pricing(printing: PricedPrinting, history: PriceHistory | null): PricingContent | null {
  const { prices } = printing;
  if (prices === null) return null;
  const money = moneyFormat(prices.currency);
  const finishes = finishQuotes(prices)
    .map(({ key, finish, quote }) => {
      const trend = quote.market === null || history === null ? undefined : priceTrend(history, printing.id, key);
      return {
        finish,
        market: quote.market === null ? null : money(quote.market),
        range: [...figure("Low", quote.low, money), ...figure("High", quote.high, money)],
        ...(trend === undefined ? {} : { trend }),
      };
    })
    .filter((finish) => finish.market !== null || finish.range.length > 0);
  if (finishes.length === 0) return null;
  return {
    finishes,
    attribution: `Prices: TCGplayer market price via TCGCSV, updated ${PRICE_DATE.format(new Date(prices.updatedAt))}`,
  };
}

function marketPrices(prices: PrintingPrices | null): PriceFigure[] {
  if (prices === null) return [];
  const money = moneyFormat(prices.currency);
  return finishQuotes(prices).flatMap(({ finish, quote }) => figure(finish, quote.market, money));
}

export function cardInfo(card: Card, printing: PricedPrinting, history: PriceHistory | null = null): CardInfoContent {
  return {
    name: card.name,
    subtitle: card.subtitle,
    kicker: kicker(card),
    stats: stats(card),
    rules: [card.ability, card.effect].filter((text): text is string => Boolean(text)),
    tags: card.tags.map((tag) => ({ label: tag, href: searchHref(`t:${quotedValue(tag)}`) })),
    artist: printing.artist,
    pricing: pricing(printing, history),
  };
}

export function printingSummaries(card: PricedCard): PrintingSummary[] {
  return card.printings.map((printing) => ({
    id: printing.id,
    setName: printing.set.name,
    code: printing.publicCode,
    details: [VARIANT_LABELS[printing.variant], capitalize(printing.rarity), printing.artist].filter(
      (detail): detail is string => detail !== null,
    ),
    imageUrl: printing.imageUrl,
    orientation: printing.orientation,
    srcset: responsiveImage(printing.imageUrl, printing.orientation, "thumbnail").srcset,
    prices: marketPrices(printing.prices),
  }));
}

export function selectedPrinting(card: PricedCard, requested: unknown): PricedPrinting {
  const [first] = card.printings;
  const match = card.printings.find((printing) => printing.id === requested);
  return match ?? (first as PricedPrinting);
}
