import { type CardId, CardIdSchema } from "@riftkeeper/cards";

export interface CardIdentity {
  name: string;
  subtitle: string | null;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cardIdFor({ name, subtitle }: CardIdentity): CardId {
  return CardIdSchema.parse(slugify(subtitle === null ? name : `${name} ${subtitle}`));
}
