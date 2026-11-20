import { CARD_TYPES, DOMAINS, RARITIES, SUPERTYPES, VARIANTS } from "@riftkeeper/cards/values";
import type { FilterField } from "./filter.ts";
import { COLOR_ALIASES, FILTER_KEYWORDS, UNSUPPORTED_KEYWORDS } from "./keywords.ts";
import { SET_RELEASE_ORDER } from "./set-order.ts";
import type { SourceSpan } from "./syntax.ts";

export interface SearchSuggestion {
  readonly label: string;
  readonly detail: string | null;
  readonly text: string;
  readonly span: SourceSpan;
}

export interface SearchSuggestions {
  readonly suggestions: readonly SearchSuggestion[];
  readonly hint: string | null;
}

const FIELD_HELP: { readonly [F in FilterField]: { readonly label: string; readonly hint: string | null } } = {
  cost: { label: "Energy cost", hint: "Energy cost: a whole number, such as cost:3 or cost:>=5." },
  might: { label: "Might", hint: "Might: a whole number, such as m:<4. Numbers take = != < <= > >=." },
  power: { label: "Power cost", hint: "Power cost: a whole number, such as p:2. Numbers take = != < <= > >=." },
  price: {
    label: "Price (USD)",
    hint: "Price: cheapest normal or foil market price in USD, such as usd<1 or price:<=2.50. Unpriced printings do not match.",
  },
  domain: { label: "Domain", hint: "Use , for any of, + for all of and - for none of, such as c:fury+calm." },
  tag: { label: "Tag", hint: "Tag: an exact region or creature tag, such as t:ionia." },
  type: { label: "Card type", hint: null },
  supertype: { label: "Supertype", hint: null },
  rarity: { label: "Rarity", hint: null },
  variant: { label: "Variant", hint: null },
  set: { label: "Set", hint: "Set: a set code or part of the set name, such as s:origins." },
  artist: { label: "Artist", hint: "Artist: part of the artist's name, such as a:kudos." },
  ability: {
    label: "Card text",
    hint: 'Card text: words from the rules text. Quote phrases, such as ability:"draw 1".',
  },
  effect: { label: "Effect", hint: 'Effect: words from the effect only, such as effect:"draw 1".' },
  keyword: { label: "Keyword", hint: 'Keyword: a bracketed rules keyword, such as k:shield or k:"shield 2".' },
  name: { label: "Exact name", hint: 'Exact name, ignoring case: name:Jinx or !"Jinx, Loose Cannon".' },
};

const VALUES: { readonly [F in FilterField]?: readonly string[] } = {
  domain: DOMAINS,
  type: CARD_TYPES,
  supertype: SUPERTYPES,
  rarity: RARITIES,
  variant: VARIANTS,
  set: SET_RELEASE_ORDER.map((code) => code.toLowerCase()),
};

const COLOR_OF = new Map<string, string>([...COLOR_ALIASES].map(([color, domain]) => [domain, color]));
const FIELDS = Object.keys(FILTER_KEYWORDS) as FilterField[];
const FIELD_BY_KEYWORD = new Map(FIELDS.flatMap((field) => FILTER_KEYWORDS[field].map((keyword) => [keyword, field])));
const WORD_BOUNDARY = /[\s()]/;
const NONE: SearchSuggestions = { suggestions: [], hint: null };

export function suggest(query: string, caret: number): SearchSuggestions {
  const at = Math.min(Math.max(caret, 0), query.length);
  let start = at;
  while (start > 0 && !WORD_BOUNDARY.test(query.charAt(start - 1))) start--;
  let end = at;
  while (end < query.length && !WORD_BOUNDARY.test(query.charAt(end))) end++;
  if (query.charAt(start) === "-" && start < at) start++;

  const typed = query.slice(start, at);
  if (/^(price|usd)[<>=!]/i.test(typed)) return { suggestions: [], hint: FIELD_HELP.price.hint };
  const colon = typed.indexOf(":");
  if (typed.slice(0, colon === -1 ? undefined : colon).includes('"')) return NONE;
  if (colon === -1) {
    if (typed === "" && query.trim() !== "") return NONE;
    return { suggestions: keywordSuggestions(typed.toLowerCase(), { start, end }), hint: null };
  }

  const keyword = typed.slice(0, colon).toLowerCase();
  const field = FIELD_BY_KEYWORD.get(keyword);
  if (field === undefined) {
    if (keyword === "") return NONE;
    const hint = UNSUPPORTED_KEYWORDS.has(keyword)
      ? `"${keyword}" is not supported yet.`
      : `"${keyword}" is not a filter. Remove it or pick one of the filters below.`;
    return { suggestions: keywordSuggestions(keyword, { start, end }), hint };
  }

  const valueStart = start + colon + 1;
  if (typed.slice(colon).includes('"')) return { suggestions: [], hint: FIELD_HELP[field].hint };
  return field === "tag"
    ? tagSuggestions(query, query.slice(valueStart, end), { start, end })
    : valueSuggestions(field, query, valueStart, at, end);
}

function keywordSuggestions(prefix: string, span: SourceSpan): SearchSuggestion[] {
  return FIELDS.flatMap((field) => {
    const keywords = FILTER_KEYWORDS[field];
    const keyword = keywords.find((candidate) => candidate === prefix) ?? keywords.find((k) => k.startsWith(prefix));
    return keyword === undefined ? [] : [{ keyword, field }];
  })
    .toSorted((a, b) => Number(b.keyword === prefix) - Number(a.keyword === prefix))
    .map(({ keyword, field }) => ({
      label: `${keyword}:`,
      detail: FIELD_HELP[field].label,
      text: `${keyword}:`,
      span,
    }));
}

function tagSuggestions(query: string, value: string, span: SourceSpan): SearchSuggestions {
  const type = CARD_TYPES.find((option) => option === value.trim().toLowerCase());
  if (type === undefined) return { suggestions: [], hint: FIELD_HELP.tag.hint };

  return {
    suggestions: [
      {
        label: `type:${type}`,
        detail: FIELD_HELP.type.label,
        text: `type:${type}${span.end === query.length ? " " : ""}`,
        span,
      },
    ],
    hint: `t: searches tags, and "${type}" is a card type. Use type:${type} instead.`,
  };
}

function valueSuggestions(
  field: FilterField,
  query: string,
  valueStart: number,
  caret: number,
  end: number,
): SearchSuggestions {
  const values = VALUES[field];
  if (values === undefined) return { suggestions: [], hint: FIELD_HELP[field].hint };

  let start = valueStart;
  let segmentEnd = end;
  if (field === "domain") {
    const value = query.slice(valueStart, caret);
    start = valueStart + Math.max(value.lastIndexOf(","), value.lastIndexOf("+")) + 1;
    if (query.charAt(start) === "-") start++;
    const next = query.slice(caret, end).search(/[,+]/);
    if (next !== -1) segmentEnd = caret + next;
  }

  const prefix = query.slice(start, caret).trim().toLowerCase();
  const complete = values.includes(query.slice(start, segmentEnd).trim().toLowerCase());
  const space = field !== "domain" && segmentEnd === query.length ? " " : "";
  const suggestions = complete
    ? []
    : values
        .filter((value) => value.startsWith(prefix))
        .map((value) => ({
          label: value,
          detail: field === "domain" ? (COLOR_OF.get(value) ?? null) : null,
          text: value + space,
          span: { start, end: segmentEnd },
        }));

  const hint =
    suggestions.length === 0 && !complete && field !== "set"
      ? `"${prefix}" is not a ${FIELD_HELP[field].label.toLowerCase()}. Use one of: ${values.join(", ")}.`
      : FIELD_HELP[field].hint;
  return { suggestions, hint };
}
