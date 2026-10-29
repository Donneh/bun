import { describe, expect, test } from "bun:test";
import { tokenize } from "./lexer.ts";

const NBSP = String.fromCharCode(0x00a0);
const EMOJI = String.fromCodePoint(0x1f600);

const types = (query: string) => tokenize(query).tokens.map((token) => token.type);
const lexemes = (query: string) => tokenize(query).tokens.map((token) => token.lexeme);

describe("tokenize", () => {
  test.each(["", "   ", "\t\n"])("produces only eof for blank input %p", (query) => {
    expect(tokenize(query)).toEqual({
      tokens: [{ type: "eof", lexeme: "", span: { start: query.length, end: query.length } }],
      warnings: [],
    });
  });

  test("splits bare words on whitespace", () => {
    expect(types("vex mocking")).toEqual(["word", "word", "eof"]);
    expect(lexemes("vex mocking")).toEqual(["vex", "mocking", ""]);
  });

  test("keeps punctuation inside words", () => {
    expect(lexemes("Kai'Sa, Survivor")).toEqual(["Kai'Sa,", "Survivor", ""]);
  });

  test.each(["cost:5", "m:>=3", "c:fury+calm", "domain:-fury"])("reads %p as one keyword value", (query) => {
    const [token] = tokenize(query).tokens;

    expect(token?.type).toBe("keywordValue");
    expect(token?.lexeme).toBe(query);
  });

  test("splits a keyword value at the first colon", () => {
    expect(tokenize("time:12:30").tokens[0]).toEqual({
      type: "keywordValue",
      lexeme: "time:12:30",
      span: { start: 0, end: 10 },
      keyword: "time",
      value: "12:30",
    });
  });

  test("reads an empty keyword and an empty value", () => {
    expect(tokenize(":fury").tokens[0]).toMatchObject({ type: "keywordValue", keyword: "", value: "fury" });
    expect(tokenize("cost:").tokens[0]).toMatchObject({ type: "keywordValue", keyword: "cost", value: "" });
  });

  test("treats a comparison without a colon as a word", () => {
    expect(types("cost>=3")).toEqual(["word", "eof"]);
  });

  test("keeps a quoted colon inside a word", () => {
    expect(tokenize('"12:30"').tokens[0]).toMatchObject({ type: "word", lexeme: '"12:30"' });
  });

  test("keeps quoted colons and spaces inside a keyword value", () => {
    expect(tokenize('name:"Ready: go"').tokens[0]).toMatchObject({
      type: "keywordValue",
      lexeme: 'name:"Ready: go"',
      keyword: "name",
      value: '"Ready: go"',
    });
  });

  test("keeps quoted parentheses inside a keyword value", () => {
    const query = 'ability:"Do this twice: Deal 3 to a unit. (You can choose different units.)"';

    expect(types(query)).toEqual(["keywordValue", "eof"]);
    expect(tokenize(query).warnings).toEqual([]);
  });

  test("warns about an unterminated quote and reads to the end", () => {
    const query = 'ability:"draw a card';
    const { tokens, warnings } = tokenize(query);

    expect(tokens[0]?.lexeme).toBe(query);
    expect(warnings).toEqual([
      {
        message: "Unterminated quote; the rest of the query was treated as part of this value.",
        span: { start: 0, end: query.length },
      },
    ]);
  });

  test("keeps escaped quotes inside a quoted value", () => {
    const query = 'ability:"say \\"hi\\""';
    const { tokens, warnings } = tokenize(query);

    expect(tokens[0]).toMatchObject({ type: "keywordValue", lexeme: query });
    expect(warnings).toEqual([]);
  });

  test("reads operator words case-insensitively but not when quoted", () => {
    expect(types('AND Or NOT "and"')).toEqual(["and", "or", "not", "word", "eof"]);
  });

  test("reads a keyword value whose value is an operator word", () => {
    expect(types("name:and")).toEqual(["keywordValue", "eof"]);
  });

  test("treats a dash as negation only when it is glued to what follows", () => {
    expect(types("-")).toEqual(["word", "eof"]);
    expect(types("a - b")).toEqual(["word", "word", "word", "eof"]);
    expect(types("-)")).toEqual(["word", "rparen", "eof"]);
    expect(types("-c:fury")).toEqual(["not", "keywordValue", "eof"]);
    expect(types("--vex")).toEqual(["not", "not", "word", "eof"]);
    expect(types("Thousand-Tailed")).toEqual(["word", "eof"]);
    expect(types("-(c:fury or c:calm)")).toEqual([
      "not",
      "lparen",
      "keywordValue",
      "or",
      "keywordValue",
      "rparen",
      "eof",
    ]);
  });

  test("splits parentheses out of words", () => {
    expect(types("foo(bar)")).toEqual(["word", "lparen", "word", "rparen", "eof"]);
    expect(types("(m:>=3 or m:<=1)")).toEqual(["lparen", "keywordValue", "or", "keywordValue", "rparen", "eof"]);
  });

  test("treats Unicode spaces as whitespace", () => {
    expect(types(`c:fury${NBSP}m:3`)).toEqual(["keywordValue", "keywordValue", "eof"]);
  });

  test("keeps no state between calls", () => {
    expect(tokenize("c:fury or m:3").tokens).toHaveLength(4);
    expect(tokenize("a b").tokens).toHaveLength(3);
  });

  test("reports spans as UTF-16 offsets into the original query", () => {
    const query = `${EMOJI} c:fury${NBSP}(m:3)`;
    const spans = tokenize(query).tokens.map((token) => query.slice(token.span.start, token.span.end));

    expect(spans).toEqual([EMOJI, "c:fury", "(", "m:3", ")", ""]);
    expect(tokenize(query).tokens[1]?.span).toEqual({ start: 3, end: 9 });
  });
});
