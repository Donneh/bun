import type { CardOrientation } from "@riftkeeper/ui";

export type ImageLayout = "grid" | "detail";

const WIDTHS: Record<ImageLayout, Record<CardOrientation, readonly [number, number]>> = {
  grid: { portrait: [240, 480], landscape: [480, 960] },
  detail: { portrait: [360, 744], landscape: [480, 1040] },
};

const QUALITY: Record<ImageLayout, number | undefined> = {
  grid: undefined,
  detail: 90,
};

const SIZES: Record<ImageLayout, Record<CardOrientation, string>> = {
  grid: { portrait: "(min-width: 40rem) 14rem, 45vw", landscape: "(min-width: 40rem) 28rem, 90vw" },
  detail: { portrait: "(min-width: 48rem) 22rem, min(22rem, 100vw)", landscape: "(min-width: 48rem) 30rem, 100vw" },
};

export function resizedWebpUrl(imageUrl: string, width: number, quality?: number): string {
  const url = new URL(imageUrl);
  url.searchParams.set("w", String(width));
  url.searchParams.set("fm", "webp");
  if (quality !== undefined) url.searchParams.set("q", String(quality));
  return url.toString();
}

export function responsiveImage(imageUrl: string, orientation: CardOrientation, layout: ImageLayout = "grid") {
  const srcset = WIDTHS[layout][orientation]
    .map((width) => `${resizedWebpUrl(imageUrl, width, QUALITY[layout])} ${width}w`)
    .join(", ");
  return { srcset, sizes: SIZES[layout][orientation] };
}
