import { extractGalleryItems } from "../src/extract-gallery-items.ts";
import type { RawPrinting } from "../src/riot-gallery.schema.ts";

const GALLERY_ITEMS_PATH = new URL("../src/fixtures/gallery-items.json", import.meta.url);

export async function loadFixtureItems(): Promise<unknown[]> {
  const items: unknown = await Bun.file(GALLERY_ITEMS_PATH).json();
  if (!Array.isArray(items)) {
    throw new Error("Gallery fixture must be a JSON array");
  }
  return items;
}

export function galleryHtml({ items, bladeIndex = 2 }: { items: unknown[]; bladeIndex?: number }): string {
  const blades: unknown[] = Array.from({ length: bladeIndex }, () => ({ type: "heroBanner" }));
  blades.push({ type: "cardGallery", cards: { items } });
  const nextData = { props: { pageProps: { page: { blades } } } };
  return `<!doctype html><html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script></head><body></body></html>`;
}

export async function loadFixturePrintings(): Promise<RawPrinting[]> {
  return extractGalleryItems(galleryHtml({ items: await loadFixtureItems() }));
}

export function printingById({ printings, id }: { printings: readonly RawPrinting[]; id: string }): RawPrinting {
  const found = printings.find((printing) => printing.id === id);
  if (!found) {
    throw new Error(`Fixture has no printing ${id}`);
  }
  return found;
}
