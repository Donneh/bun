import type { CardOrientation } from "@riftkeeper/ui";

const WIDTHS: Record<CardOrientation, readonly [number, number]> = {
  portrait: [240, 480],
  landscape: [480, 960],
};

const SIZES: Record<CardOrientation, string> = {
  portrait: "(min-width: 40rem) 14rem, 45vw",
  landscape: "(min-width: 40rem) 28rem, 90vw",
};

export function resizedWebpUrl(imageUrl: string, width: number): string {
  const url = new URL(imageUrl);
  url.searchParams.set("w", String(width));
  url.searchParams.set("fm", "webp");
  return url.toString();
}

export function responsiveImage(imageUrl: string, orientation: CardOrientation) {
  const srcset = WIDTHS[orientation].map((width) => `${resizedWebpUrl(imageUrl, width)} ${width}w`).join(", ");
  return { srcset, sizes: SIZES[orientation] };
}
