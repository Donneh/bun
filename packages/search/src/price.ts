import type { Printing } from "@riftkeeper/cards";
import type { PrintingPrices } from "@riftkeeper/cards/prices";

export function marketPrice(printing: Printing & { readonly prices?: PrintingPrices | null }): number | null {
  const normal = printing.prices?.normal?.market ?? null;
  const foil = printing.prices?.foil?.market ?? null;
  if (normal === null) return foil;
  if (foil === null) return normal;
  return Math.min(normal, foil);
}
