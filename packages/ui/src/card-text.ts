export type CardTextPart =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "keyword"; readonly text: string }
  | { readonly kind: "symbol"; readonly text: string; readonly label: string; readonly round: boolean };

const TOKEN = /\[([A-Za-z][^\][]*)\]|:rb_([a-z0-9_]+):/g;

const NAMED_SYMBOLS: Record<string, { readonly text: string; readonly label: string }> = {
  might: { text: "might", label: "Might" },
  exhaust: { text: "exhaust", label: "Exhaust" },
  rune_rainbow: { text: "any rune", label: "Rune of any domain" },
};

function symbolPart(name: string): CardTextPart {
  const named = NAMED_SYMBOLS[name];
  if (named) return { kind: "symbol", ...named, round: false };
  const energy = /^energy_(\d+)$/.exec(name)?.[1];
  if (energy) return { kind: "symbol", text: energy, label: `${energy} energy`, round: true };
  const domain = /^rune_([a-z]+)$/.exec(name)?.[1];
  const words = domain ? `${domain} rune` : name.replaceAll("_", " ");
  return { kind: "symbol", text: words, label: words, round: false };
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
