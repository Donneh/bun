export interface QuerySuggestion {
  readonly label: string;
  readonly detail: string | null;
  readonly text: string;
  readonly span: { readonly start: number; readonly end: number };
}
