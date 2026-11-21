import type { CardOrientation } from "./card-summary.ts";
import type { GlyphName, GlyphTextPart } from "./glyph.ts";

export interface CardStat {
  readonly label: string;
  readonly value: string;
  readonly glyph?: GlyphName;
  readonly valueShown: boolean;
}

export interface CardLink {
  readonly label: string;
  readonly href: string;
}

export interface CardKickerItem {
  readonly parts: readonly GlyphTextPart[];
  readonly href: string;
}

export interface PriceFigure {
  readonly label: string;
  readonly amount: string;
}

export interface PriceDay {
  readonly date: string;
  readonly amount: number | null;
  readonly price: string | null;
}

export interface PriceTrend {
  readonly change: string;
  readonly period: string;
  readonly description: string;
  readonly days: readonly PriceDay[];
}

export interface FinishPricing {
  readonly finish: string;
  readonly market: string | null;
  readonly range: readonly PriceFigure[];
  readonly trend?: PriceTrend;
}

export interface PricingContent {
  readonly finishes: readonly FinishPricing[];
  readonly attribution: string;
}

export interface PrintingSummary {
  readonly id: string;
  readonly setName: string;
  readonly code: string;
  readonly details: readonly string[];
  readonly imageUrl: string;
  readonly orientation: CardOrientation;
  readonly srcset?: string;
  readonly prices: readonly PriceFigure[];
}

export type LegalityStatus = "legal" | "banned" | "upcoming";

export interface LegalityRow {
  readonly format: string;
  readonly status: LegalityStatus;
  readonly label: string;
  readonly note?: string;
  readonly source?: CardLink;
}

export type RulesNote =
  | { readonly kind: "ban"; readonly date: string; readonly text: string; readonly source: CardLink }
  | {
      readonly kind: "errata";
      readonly date: string;
      readonly current: string;
      readonly previous: string;
      readonly source: CardLink;
    }
  | {
      readonly kind: "ruling";
      readonly date: string;
      readonly question: readonly GlyphTextPart[];
      readonly answer: readonly (readonly GlyphTextPart[])[];
      readonly source: CardLink;
    };

export interface CardInfoContent {
  readonly name: string;
  readonly subtitle: string | null;
  readonly kicker: readonly CardKickerItem[];
  readonly stats: readonly CardStat[];
  readonly rules: readonly string[];
  readonly textCaption?: string;
  readonly legendSearch?: CardLink;
  readonly tags: readonly CardLink[];
  readonly artist: CardLink | null;
  readonly pricing: PricingContent | null;
  readonly legality: readonly LegalityRow[] | null;
  readonly notes: readonly RulesNote[];
}
