import { type GlyphName, isGlyphName } from "./glyph.ts";
import { type KeywordTone, keywordHoldsCost, keywordTone } from "./keyword.ts";

export type KeywordPart = {
  readonly kind: "keyword";
  readonly text: string;
  readonly tone: KeywordTone;
  readonly arrow: boolean;
  readonly joined: boolean;
  readonly cost: readonly GlyphName[];
};

export type CardTextPart =
  | { readonly kind: "text"; readonly text: string }
  | KeywordPart
  | { readonly kind: "glyph"; readonly name: GlyphName };

const TOKEN = /(\s*\[>>\])?\[([A-Za-z][^\][]*)\](\[>\])?|:rb_([a-z0-9_]+):/g;
const COST = / ((?::rb_[a-z0-9_]+:)+)/y;
const SYMBOL = /:rb_([a-z0-9_]+):/g;

function symbolPart(name: string): CardTextPart {
  return isGlyphName(name) ? { kind: "glyph", name } : { kind: "text", text: name.replaceAll("_", " ") };
}

function costAt(source: string, position: number): { glyphs: GlyphName[]; length: number } | undefined {
  COST.lastIndex = position;
  const match = COST.exec(source);
  if (match === null) return undefined;
  const names = [...(match[1] ?? "").matchAll(SYMBOL)].map((symbol) => symbol[1] ?? "");
  if (!names.every(isGlyphName)) return undefined;
  return { glyphs: names, length: match[0].length };
}

export function parseCardText(source: string): CardTextPart[] {
  const parts: CardTextPart[] = [];
  let position = 0;
  for (const match of source.matchAll(TOKEN)) {
    if (match.index < position) continue;
    if (match.index > position) parts.push({ kind: "text", text: source.slice(position, match.index) });
    const [whole, join, keyword, arrow, symbol] = match;
    position = match.index + whole.length;
    if (keyword === undefined) {
      parts.push(symbolPart(symbol ?? ""));
      continue;
    }
    const cost = arrow === undefined && keywordHoldsCost(keyword) ? costAt(source, position) : undefined;
    if (cost !== undefined) position += cost.length;
    parts.push({
      kind: "keyword",
      text: keyword,
      tone: keywordTone(keyword),
      arrow: arrow !== undefined,
      joined: join !== undefined,
      cost: cost?.glyphs ?? [],
    });
  }
  if (position < source.length) parts.push({ kind: "text", text: source.slice(position) });
  return parts;
}
