import { describe, expect, test } from "bun:test";
import { galleryHtml, loadFixtureItems } from "../test-support/fixtures.ts";
import { extractGalleryItems } from "./extract-gallery-items.ts";

function thrownMessage(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected the call to throw");
}

describe("extractGalleryItems", () => {
  test("returns every validated printing from the cards blade", async () => {
    const items = await loadFixtureItems();
    const printings = extractGalleryItems(galleryHtml({ items }));
    expect(printings).toHaveLength(items.length);
    expect(String(printings[0]?.id)).toBe("ogn-066-298");
    expect(printings[0]?.subtitle).toBe("Alluring");
  });

  test("finds the cards blade wherever it sits", async () => {
    const items = await loadFixtureItems();
    expect(extractGalleryItems(galleryHtml({ items, bladeIndex: 0 }))).toHaveLength(items.length);
    expect(extractGalleryItems(galleryHtml({ items, bladeIndex: 7 }))).toHaveLength(items.length);
  });

  test("throws when the page has no __NEXT_DATA__ script", () => {
    expect(() => extractGalleryItems("<html><body>nothing</body></html>")).toThrow("__NEXT_DATA__");
  });

  test("throws when the script is not JSON", () => {
    const html = '<script id="__NEXT_DATA__" type="application/json">{nope</script>';
    expect(() => extractGalleryItems(html)).toThrow("valid JSON");
  });

  test("throws when no blade carries cards", () => {
    const nextData = { props: { pageProps: { page: { blades: [{ type: "heroBanner" }] } } } };
    const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`;
    expect(() => extractGalleryItems(html)).toThrow("cards.items");
  });

  test("throws when the cards list is empty", () => {
    expect(() => extractGalleryItems(galleryHtml({ items: [] }))).toThrow("empty");
  });

  test("throws with the failing path when an item has the wrong shape", async () => {
    const [first, ...rest] = await loadFixtureItems();
    const broken = { ...(typeof first === "object" ? first : {}), rarity: { value: { id: "mythic" } } };
    expect(() => extractGalleryItems(galleryHtml({ items: [broken, ...rest] }))).toThrow("rarity");
  });

  test("groups the same problem across printings into one line with example ids", async () => {
    const items = await loadFixtureItems();
    const broken = items.map((item) => ({
      ...(typeof item === "object" ? item : {}),
      rarity: { value: { id: "mythic" } },
    }));
    const message = thrownMessage(() => extractGalleryItems(galleryHtml({ items: broken })));
    const lines = message.split("\n").filter((line) => line.startsWith("- "));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("rarity.value.id");
    expect(lines[0]).toContain(`[${items.length} printings (e.g. ogn-066-298, `);
    expect(message).toContain(`in ${items.length} of ${items.length} printings:`);
  });

  test("lists at most three example ids per problem", async () => {
    const items = await loadFixtureItems();
    const broken = items.map((item) => ({ ...(typeof item === "object" ? item : {}), rarity: undefined }));
    const message = thrownMessage(() => extractGalleryItems(galleryHtml({ items: broken })));
    const examples = /(e.g. ([^)]*))/.exec(message)?.[1]?.split(", ") ?? [];
    expect(examples).toHaveLength(3);
  });

  test("keeps different problems on separate lines", async () => {
    const [first, second, ...rest] = await loadFixtureItems();
    const objectOf = (item: unknown) => (typeof item === "object" ? item : {});
    const items = [{ ...objectOf(first), rarity: undefined }, { ...objectOf(second), name: "" }, ...rest];
    const lines = thrownMessage(() => extractGalleryItems(galleryHtml({ items })))
      .split("\n")
      .filter((line) => line.startsWith("- "));
    expect(lines).toHaveLength(2);
  });
});
