import type { SearchWarning, SourceSpan, Token } from "./syntax.ts";

export interface LexResult {
  readonly tokens: readonly Token[];
  readonly warnings: readonly SearchWarning[];
}

const UNICODE_SPACES = /[\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g;
const WHITESPACE = " \t\n\r\v\f";
const OPERATOR_WORDS = new Map<string, "and" | "or" | "not">([
  ["and", "and"],
  ["or", "or"],
  ["not", "not"],
]);

export function tokenize(query: string): LexResult {
  const text = query.replace(UNICODE_SPACES, " ");
  const tokens: Token[] = [];
  const warnings: SearchWarning[] = [];
  let position = 0;

  const isWhitespace = (index: number) => index < text.length && WHITESPACE.includes(text.charAt(index));
  const single = (type: "lparen" | "rparen" | "not"): Token => {
    position++;
    return { type, lexeme: text.charAt(position - 1), span: { start: position - 1, end: position } };
  };

  const readWord = (): Token => {
    const start = position;
    let colon: number | null = null;

    while (position < text.length && !isWhitespace(position)) {
      const char = text.charAt(position);

      if (char === "(" || char === ")") {
        break;
      }

      if (char === "\\" && position + 1 < text.length) {
        position += 2;
      } else if (char === '"') {
        const close = closingQuote(text, position);
        position = close === -1 ? text.length : close + 1;

        if (close === -1) {
          warnings.push({
            message: "Unterminated quote; the rest of the query was treated as part of this value.",
            span: { start, end: position },
          });
        }
      } else {
        if (char === ":" && colon === null) {
          colon = position;
        }
        position++;
      }
    }

    const lexeme = text.slice(start, position);
    const span: SourceSpan = { start, end: position };
    const operator = OPERATOR_WORDS.get(lexeme.toLowerCase());

    if (operator) {
      return { type: operator, lexeme, span };
    }

    if (colon === null) {
      return { type: "word", lexeme, span };
    }

    return {
      type: "keywordValue",
      lexeme,
      span,
      keyword: text.slice(start, colon),
      value: text.slice(colon + 1, position),
    };
  };

  while (true) {
    while (isWhitespace(position)) {
      position++;
    }

    if (position >= text.length) {
      break;
    }

    const char = text.charAt(position);
    const startsNegation =
      char === "-" && position + 1 < text.length && !isWhitespace(position + 1) && text.charAt(position + 1) !== ")";

    if (char === "(") {
      tokens.push(single("lparen"));
    } else if (char === ")") {
      tokens.push(single("rparen"));
    } else if (startsNegation) {
      tokens.push(single("not"));
    } else {
      tokens.push(readWord());
    }
  }

  tokens.push({ type: "eof", lexeme: "", span: { start: text.length, end: text.length } });

  return { tokens, warnings };
}

export function unquote(raw: string): string {
  const unterminated = unterminatedQuote(raw);
  const unquoted =
    unterminated !== -1
      ? raw.slice(0, unterminated) + raw.slice(unterminated + 1)
      : raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')
        ? raw.slice(1, -1)
        : raw;

  return unquoted.replace(/\\([\s\S])/g, "$1");
}

function closingQuote(text: string, open: number): number {
  for (let index = open + 1; index < text.length; index++) {
    const char = text.charAt(index);

    if (char === "\\" && index + 1 < text.length) {
      index++;
    } else if (char === '"') {
      return index;
    }
  }

  return -1;
}

function unterminatedQuote(text: string): number {
  for (let index = 0; index < text.length; index++) {
    const char = text.charAt(index);

    if (char === "\\" && index + 1 < text.length) {
      index++;
    } else if (char === '"') {
      const close = closingQuote(text, index);

      if (close === -1) {
        return index;
      }

      index = close;
    }
  }

  return -1;
}
