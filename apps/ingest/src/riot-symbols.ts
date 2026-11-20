import type { Domain } from "@riftkeeper/cards";

const SYMBOLS: Readonly<Record<string, string>> = {
  A: ":rb_rune_rainbow:",
  M: ":rb_might:",
  S: ":rb_might:",
  E: ":rb_exhaust:",
};

export function ownDomainRune(domains: readonly Domain[]): string | null {
  const own = domains.filter((domain) => domain !== "colorless");
  return own.length === 1 ? `:rb_rune_${own[0]}:` : null;
}

export function toGallerySymbols(text: string, ownRune: string | null = null): string {
  return text.replace(/\[([AMSEC]|\d+)\]/g, (whole, symbol: string) => {
    if (/^\d+$/.test(symbol)) return `:rb_energy_${symbol}:`;
    if (symbol === "C") return ownRune ?? whole;
    return SYMBOLS[symbol] ?? whole;
  });
}
