import type { ComparisonOperator, FilterChip, FilterChipValue, SourceSpan } from "@riftkeeper/search";
import type { FilterChipSummary, GlyphName } from "@riftkeeper/ui";
import { isGlyphName } from "@riftkeeper/ui/glyph";
import { domainGlyph } from "./card-detail";

const OPERATOR_SYMBOLS: Record<ComparisonOperator, string> = {
  "=": "",
  "!=": "≠ ",
  "<": "< ",
  "<=": "≤ ",
  ">": "> ",
  ">=": "≥ ",
};

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

function formatValue(value: FilterChipValue): string {
  switch (value.kind) {
    case "numeric":
      return `${OPERATOR_SYMBOLS[value.operator]}${value.value}`;
    case "domain":
      return [
        value.anyOf.map(capitalize).join(" or "),
        value.allOf.map(capitalize).join(" and "),
        value.noneOf.map((domain) => `not ${capitalize(domain)}`).join(", "),
      ]
        .filter(Boolean)
        .join(", ");
    case "select":
    case "text":
      return value.value;
  }
}

export function chipId(span: SourceSpan): string {
  return `${span.start}-${span.end}`;
}

function chipGlyphs(chip: FilterChip): GlyphName[] {
  const { field, value } = chip;
  if (value.kind === "domain") return [...value.anyOf, ...value.allOf, ...value.noneOf].map(domainGlyph);
  if (field === "might") return ["might"];
  if (field === "type" && value.kind === "select") {
    const name = `card_type_${value.value.toLowerCase()}`;
    return isGlyphName(name) ? [name] : [];
  }
  return [];
}

export function toChipSummary(chip: FilterChip): FilterChipSummary {
  return {
    id: chipId(chip.span),
    label: chip.label,
    value: formatValue(chip.value),
    glyphs: chipGlyphs(chip),
    removable: chip.editable,
  };
}

const LEADING_AND = /^and(?:\s+|$)/i;
const TRAILING_AND = /(?:^|\s+)and$/i;

export function removeSpan(query: string, span: SourceSpan): string {
  let before = query.slice(0, span.start).trimEnd();
  let after = query.slice(span.end).trimStart();
  if (LEADING_AND.test(after)) after = after.replace(LEADING_AND, "");
  else if (TRAILING_AND.test(before)) before = before.replace(TRAILING_AND, "");
  return [before, after].filter(Boolean).join(" ");
}
