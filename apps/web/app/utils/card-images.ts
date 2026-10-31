import type { CardOrientation } from "@riftkeeper/ui";

export type ImageLayout = "grid" | "detail" | "thumbnail";

const WIDTHS: Record<ImageLayout, Record<CardOrientation, readonly [number, number]>> = {
  grid: { portrait: [240, 480], landscape: [480, 960] },
  detail: { portrait: [360, 744], landscape: [720, 1040] },
  thumbnail: { portrait: [80, 160], landscape: [80, 160] },
};

const QUALITY: Record<ImageLayout, number | undefined> = {
  grid: undefined,
  detail: 90,
  thumbnail: undefined,
};

const SIZES: Record<ImageLayout, Record<CardOrientation, string>> = {
  grid: { portrait: "(min-width: 40rem) 14rem, 45vw", landscape: "(min-width: 40rem) 28rem, 90vw" },
  detail: { portrait: "(min-width: 48rem) 22rem, min(18rem, 80vw)", landscape: "(min-width: 48rem) 42rem, 100vw" },
  thumbnail: { portrait: "2.5rem", landscape: "2.5rem" },
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
