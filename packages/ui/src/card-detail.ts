export interface CardFact {
  readonly label: string;
  readonly value: string;
  readonly rulesText?: boolean;
}

export interface PrintingSummary {
  readonly id: string;
  readonly setName: string;
  readonly code: string;
  readonly details: readonly string[];
}
