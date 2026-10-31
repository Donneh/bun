import { type GlyphName, isGlyphName } from "./glyph.ts";

export type CardTextPart =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "keyword"; readonly text: string }
  | { readonly kind: "glyph"; readonly name: GlyphName };

const TOKEN = /\[([A-Za-z][^\][]*)\]|:rb_([a-z0-9_]+):/g;

function symbolPart(name: string): CardTextPart {
  return isGlyphName(name) ? { kind: "glyph", name } : { kind: "text", text: name.replaceAll("_", " ") };
}

export function parseCardText(source: string): CardTextPart[] {
  const parts: CardTextPart[] = [];
  let position = 0;
  for (const match of source.matchAll(TOKEN)) {
    if (match.index > position) parts.push({ kind: "text", text: source.slice(position, match.index) });
    const [whole, keyword, symbol] = match;
    parts.push(keyword === undefined ? symbolPart(symbol ?? "") : { kind: "keyword", text: keyword });
    position = match.index + whole.length;
  }
  if (position < source.length) parts.push({ kind: "text", text: source.slice(position) });
  return parts;
}
