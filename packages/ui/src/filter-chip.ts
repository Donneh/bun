import type { GlyphName } from "./glyph.ts";

export interface FilterChipSummary {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly glyphs: readonly GlyphName[];
  readonly removable: boolean;
}
