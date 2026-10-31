import type { GlyphTextPart } from "./glyph.ts";

export type CardFact =
  | { readonly label: string; readonly value: readonly GlyphTextPart[] }
  | { readonly label: string; readonly rulesText: string };

export interface PrintingSummary {
  readonly id: string;
  readonly setName: string;
  readonly code: string;
  readonly details: readonly string[];
}
