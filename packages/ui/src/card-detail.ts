import type { CardOrientation } from "./card-summary.ts";
import type { GlyphName, GlyphTextPart } from "./glyph.ts";

export interface CardStat {
  readonly label: string;
  readonly value: string;
  readonly glyph?: GlyphName;
  readonly valueShown: boolean;
}

export interface CardTag {
  readonly label: string;
  readonly href: string;
}

export interface PriceFigure {
  readonly label: string;
  readonly amount: string;
}

export interface FinishPricing {
  readonly finish: string;
  readonly market: string | null;
  readonly range: readonly PriceFigure[];
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

export interface CardInfoContent {
  readonly name: string;
  readonly subtitle: string | null;
  readonly kicker: readonly (readonly GlyphTextPart[])[];
  readonly stats: readonly CardStat[];
  readonly rules: readonly string[];
  readonly tags: readonly CardTag[];
  readonly artist: string | null;
  readonly pricing: PricingContent | null;
}
