import {
  CardTypeSchema,
  type Domain,
  DomainSchema,
  RaritySchema,
  SupertypeSchema,
  type Variant,
  VariantSchema,
} from "@riftkeeper/cards";
import type { ComparisonOperator, Filter, NumericField, TextField } from "./filter.ts";

export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string };

type FilterParser = (value: string) => Parsed<Filter>;

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const invalid = (message: string): Parsed<never> => ({ ok: false, message });

const OPERATORS_LONGEST_FIRST: readonly ComparisonOperator[] = [">=", "<=", "!=", ">", "<", "="];

const COLOR_ALIASES = new Map<string, Domain>([
  ["red", "fury"],
  ["green", "calm"],
  ["blue", "mind"],
  ["orange", "body"],
  ["purple", "chaos"],
  ["yellow", "order"],
]);

const VARIANT_ALIASES = new Map<string, Variant>([
  ["alt art", "alt-art"],
  ["altart", "alt-art"],
  ["signature", "signed"],
]);

const UNSUPPORTED_KEYWORDS = new Set(["promo", "owned", "flavor", "legal", "keyword", "k"]);

function numeric(field: NumericField): FilterParser {
  return (value) => {
    const operator = OPERATORS_LONGEST_FIRST.find((candidate) => value.startsWith(candidate));
    const digits = value.slice(operator?.length ?? 0).trim();
    const number = Number(digits);

    if (!/^-?\d+$/.test(digits) || !Number.isSafeInteger(number)) {
      return invalid(`"${value}" is not a whole number.`);
    }

    return ok({ field, comparison: { operator: operator ?? "=", value: Object.is(number, -0) ? 0 : number } });
  };
}

function text(field: TextField): FilterParser {
  return (value) =>
    value === "" ? invalid(`${capitalize(field)} value cannot be empty.`) : ok({ field, text: value });
}

function oneOf<V extends string>(
  noun: string,
  options: readonly V[],
  value: string,
  aliases: ReadonlyMap<string, V> = new Map(),
): Parsed<V> {
  const name = value.trim().toLowerCase();
  const match = aliases.get(name) ?? options.find((option) => option === name);

  return match === undefined ? invalid(`"${value}" is not a ${noun}. Use one of: ${options.join(", ")}.`) : ok(match);
}

function enumeration<F extends "type" | "supertype" | "rarity" | "variant", V extends string>(
  field: F,
  options: readonly V[],
  aliases?: ReadonlyMap<string, V>,
): (value: string) => Parsed<{ readonly field: F; readonly value: V }> {
  return (value) => {
    if (value === "") {
      return invalid(`${capitalize(field)} value cannot be empty.`);
    }

    const parsed = oneOf(field, options, value, aliases);
    return parsed.ok ? ok({ field, value: parsed.value }) : parsed;
  };
}

function domain(value: string): Parsed<Filter> {
  const anyOf: Domain[] = [];
  const allOf: Domain[] = [];
  const noneOf: Domain[] = [];
  const segments = value
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");

  for (const segment of segments) {
    const [target, names] = segment.startsWith("-")
      ? [noneOf, [segment.slice(1)]]
      : segment.includes("+")
        ? [allOf, segment.split("+")]
        : [anyOf, [segment]];

    for (const name of names) {
      const parsed = oneOf("domain", DomainSchema.options, name.trim(), COLOR_ALIASES);

      if (!parsed.ok) {
        return parsed;
      }

      target.push(parsed.value);
    }
  }

  if (anyOf.length === 0 && allOf.length === 0 && noneOf.length === 0) {
    return invalid(`"${value}" is not a valid domain.`);
  }

  return ok({ field: "domain", anyOf, allOf, noneOf });
}

const FILTERS: ReadonlyArray<readonly [readonly string[], FilterParser]> = [
  [["cost"], numeric("cost")],
  [["might", "m"], numeric("might")],
  [["power", "p"], numeric("power")],
  [["domain", "d", "c", "color"], domain],
  [["tag", "t"], text("tag")],
  [["type"], enumeration("type", CardTypeSchema.options)],
  [["supertype"], enumeration("supertype", SupertypeSchema.options)],
  [["rarity", "r"], enumeration("rarity", RaritySchema.options)],
  [["variant"], enumeration("variant", VariantSchema.options, VARIANT_ALIASES)],
  [["set", "s"], text("set")],
  [["artist", "a"], text("artist")],
  [["ability"], text("ability")],
];

const PARSERS_BY_KEYWORD = new Map(
  FILTERS.flatMap(([keywords, parser]) => keywords.map((keyword) => [keyword, parser] as const)),
);

export function parseFilter(keyword: string, value: string): Parsed<Filter> {
  const parser = PARSERS_BY_KEYWORD.get(keyword);

  if (parser) {
    const parsed = parser(value.trim());
    return parsed.ok ? parsed : invalid(`Invalid value for "${keyword}": ${parsed.message}`);
  }

  if (UNSUPPORTED_KEYWORDS.has(keyword)) {
    return invalid(`"${keyword}" is not supported yet and was ignored.`);
  }

  return invalid(keyword === "" ? 'Missing keyword before ":".' : `Unknown keyword "${keyword}" was ignored.`);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
