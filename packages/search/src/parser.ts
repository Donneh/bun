import type { ParsedQuery, SearchNode } from "./ast.ts";
import { parseFilter } from "./filter-parsers.ts";
import { tokenize, unquote } from "./lexer.ts";
import type { SearchWarning, SourceSpan, Token, TokenType } from "./syntax.ts";

export function parseQuery(query: string): ParsedQuery {
  return new Parser(query).parse();
}

type KeywordValueToken = Extract<Token, { type: "keywordValue" }>;

class Parser {
  private readonly tokens: readonly Token[];
  private readonly end: Token;
  private readonly warnings: SearchWarning[];
  private cursor = 0;
  private groupDepth = 0;

  constructor(query: string) {
    const lexed = tokenize(query);
    this.tokens = lexed.tokens;
    this.warnings = [...lexed.warnings];
    this.end = { type: "eof", lexeme: "", span: { start: query.length, end: query.length } };
  }

  parse(): ParsedQuery {
    const terms = [this.parseOr()];

    while (!this.check("eof")) {
      this.warnUnexpected(this.advance());
      terms.push(this.parseOr());
    }

    return { root: combine("and", terms), warnings: this.warnings };
  }

  private parseOr(): SearchNode | null {
    const operators = this.danglingOperators();
    const branches = [this.parseOperand(operators, () => this.parseAnd())];

    while (this.check("or")) {
      operators.operator(this.advance());
      branches.push(this.parseOperand(operators, () => this.parseAnd()));
    }

    operators.finish();
    return combine("or", branches);
  }

  private parseAnd(): SearchNode | null {
    const operators = this.danglingOperators();
    const terms: (SearchNode | null)[] = [];
    const words: string[] = [];

    while (!this.check("eof") && !this.check("rparen") && !this.check("or")) {
      if (this.check("and")) {
        operators.operator(this.advance());
      } else if (this.check("word")) {
        operators.operand();
        words.push(unquote(this.advance().lexeme));
      } else {
        terms.push(this.parseOperand(operators, () => this.parseNot()));
      }
    }

    operators.finish();

    if (words.length > 0) {
      terms.push({ kind: "text", value: words.join(" ") });
    }

    return combine("and", terms);
  }

  private parseNot(): SearchNode | null {
    let negations = 0;
    let operator: Token | null = null;

    while (this.check("not")) {
      operator ??= this.peek();
      this.advance();
      negations++;
    }

    const inner = this.parsePrimary();

    if (operator === null) {
      return inner;
    }

    if (inner === null) {
      this.warn(`Nothing to negate after "${operator.lexeme}".`, operator.span);
      return null;
    }

    const marked: SearchNode = inner.kind === "filter" ? { ...inner, negated: true } : inner;
    return negations % 2 === 1 ? { kind: "not", child: marked } : marked;
  }

  private parsePrimary(): SearchNode | null {
    const token = this.peek();

    switch (token.type) {
      case "lparen":
        return this.parseGroup();
      case "word":
        this.advance();
        return { kind: "text", value: unquote(token.lexeme) };
      case "keywordValue":
        this.advance();
        return this.resolveFilter(token);
      case "rparen":
      case "or":
      case "eof":
        return null;
      default:
        this.warnUnexpected(this.advance());
        return null;
    }
  }

  private parseGroup(): SearchNode | null {
    const open = this.advance();
    const contentStart = this.cursor;

    this.groupDepth++;
    const inner = this.parseOr();
    this.groupDepth--;

    const isEmpty = this.cursor === contentStart;
    const close = this.check("rparen") ? this.advance() : null;

    if (close === null) {
      this.warn('Missing closing ")" for the group starting here; its contents were still used.', open.span);
    }

    if (isEmpty) {
      this.warn("Empty group was ignored.", { start: open.span.start, end: (close ?? open).span.end });
    }

    return inner;
  }

  private resolveFilter(token: KeywordValueToken): SearchNode | null {
    const keyword = unquote(token.keyword).trim().toLowerCase();
    const parsed = parseFilter(keyword, unquote(token.value));

    if (!parsed.ok) {
      this.warn(parsed.message, token.span);
      return null;
    }

    return {
      kind: "filter",
      filter: parsed.value,
      keyword,
      span: token.span,
      groupDepth: this.groupDepth,
      negated: false,
    };
  }

  private parseOperand(operators: DanglingOperators, parse: () => SearchNode | null): SearchNode | null {
    const start = this.cursor;
    const node = parse();

    if (this.cursor > start) {
      operators.operand();
    }

    return node;
  }

  private danglingOperators(): DanglingOperators {
    let hasOperand = false;
    let pending: Token | null = null;
    const warn = (token: Token) => this.warn(`Dangling "${token.lexeme}" was ignored.`, token.span);

    return {
      operator: (token) => {
        if (!hasOperand) {
          warn(token);
          return;
        }

        if (pending !== null) {
          warn(pending);
        }
        pending = token;
      },
      operand: () => {
        hasOperand = true;
        pending = null;
      },
      finish: () => {
        if (pending !== null) {
          warn(pending);
        }
      },
    };
  }

  private warnUnexpected(token: Token): void {
    this.warn(`Unexpected "${token.lexeme}" was ignored.`, token.span);
  }

  private warn(message: string, span: SourceSpan): void {
    this.warnings.push({ message, span });
  }

  private peek(): Token {
    return this.tokens[this.cursor] ?? this.end;
  }

  private check(type: TokenType | "keywordValue"): boolean {
    return this.peek().type === type;
  }

  private advance(): Token {
    const token = this.peek();

    if (token.type !== "eof") {
      this.cursor++;
    }

    return token;
  }
}

interface DanglingOperators {
  operator(token: Token): void;
  operand(): void;
  finish(): void;
}

function combine(kind: "and" | "or", terms: readonly (SearchNode | null)[]): SearchNode | null {
  const present = terms.filter((term): term is SearchNode => term !== null);

  if (present.length <= 1) {
    return present[0] ?? null;
  }

  return { kind, children: present };
}
