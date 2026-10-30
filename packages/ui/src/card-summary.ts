export type CardOrientation = "portrait" | "landscape";

export interface CardSummary {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string | null;
  readonly imageUrl: string;
  readonly srcset?: string;
  readonly sizes?: string;
  readonly href: string;
  readonly orientation: CardOrientation;
}
