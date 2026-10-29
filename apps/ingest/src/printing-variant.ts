import type { Variant } from "@riftkeeper/cards";

const VARIANT_PATTERNS: readonly (readonly [RegExp, Variant])[] = [
  [/^[a-z]+-\d+-\d+$/, "standard"],
  [/^[a-z]+-\d+[a-z]-\d+$/, "alt-art"],
  [/^[a-z]+-\d+-star-\d+$/, "signed"],
  [/^[a-z]+-sp\d+-\d+$/, "special"],
  [/^[a-z]+-t\d+$/, "token"],
  [/^[a-z]+-r\d+[a-z]?$/, "rune"],
];

export function printingVariant(printingId: string): Variant {
  for (const [pattern, variant] of VARIANT_PATTERNS) {
    if (pattern.test(printingId)) {
      return variant;
    }
  }
  throw new Error(`Unrecognised printing id pattern: ${printingId}`);
}
