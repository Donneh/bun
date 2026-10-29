export interface SourceSpan {
  readonly start: number;
  readonly end: number;
}

export type TokenType = "lparen" | "rparen" | "and" | "or" | "not" | "word" | "eof";

export type Token =
  | { readonly type: TokenType; readonly lexeme: string; readonly span: SourceSpan }
  | {
      readonly type: "keywordValue";
      readonly lexeme: string;
      readonly span: SourceSpan;
      readonly keyword: string;
      readonly value: string;
    };

export interface SearchWarning {
  readonly message: string;
  readonly span: SourceSpan;
}
