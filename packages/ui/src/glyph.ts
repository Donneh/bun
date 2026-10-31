import { GLYPH_MARKUP } from "./glyph-markup.ts";

export type GlyphName = keyof typeof GLYPH_MARKUP;

export type GlyphTextPart =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "glyph"; readonly name: GlyphName; readonly label?: string; readonly decorative?: boolean };

export const GLYPH_NAMES = Object.keys(GLYPH_MARKUP) as GlyphName[];

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

export function isGlyphName(name: string): name is GlyphName {
  return Object.hasOwn(GLYPH_MARKUP, name);
}

export function glyphMarkup(name: GlyphName, idPrefix: string): string {
  return GLYPH_MARKUP[name].replaceAll("GLYPH_ID", idPrefix);
}

export function isDiscGlyph(name: GlyphName): boolean {
  return name.startsWith("energy_") || (name.startsWith("rune_") && name !== "rune_rainbow");
}

export function glyphLabel(name: GlyphName): string {
  if (name === "rune_rainbow") return "Rune of any domain";
  const energy = /^energy_(\d+)$/.exec(name)?.[1];
  if (energy !== undefined) return `${energy} energy`;
  const domain = /^rune_([a-z]+)$/.exec(name)?.[1];
  if (domain !== undefined) return `${capitalize(domain)} rune`;
  return capitalize(name.replace(/^card_type_/, ""));
}
