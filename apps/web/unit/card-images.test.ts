import { describe, expect, test } from "bun:test";
import { type ImageLayout, resizedWebpUrl, responsiveImage } from "../app/utils/card-images.ts";

const cdnUrl = "https://cdn.example.com/images/abc-744x1039.png";

const widths = (orientation: "portrait" | "landscape", layout: ImageLayout = "grid") =>
  [...responsiveImage(cdnUrl, orientation, layout).srcset.matchAll(/ (\d+)w/g)].map((match) => Number(match[1]));

describe("resizedWebpUrl", () => {
  test("requests the width as WebP", () => {
    expect(resizedWebpUrl(cdnUrl, 480)).toBe(`${cdnUrl}?w=480&fm=webp`);
  });

  test("keeps an existing query string", () => {
    const url = new URL(resizedWebpUrl(`${cdnUrl}?rect=0,0,100,100&w=999`, 480));

    expect(url.searchParams.get("rect")).toBe("0,0,100,100");
    expect(url.searchParams.getAll("w")).toEqual(["480"]);
    expect(url.searchParams.get("fm")).toBe("webp");
  });
});

describe("responsiveImage", () => {
  test("offers a normal and a high-density width", () => {
    expect(responsiveImage(cdnUrl, "portrait").srcset).toBe(
      `${cdnUrl}?w=240&fm=webp 240w, ${cdnUrl}?w=480&fm=webp 480w`,
    );
  });

  test("offers wider variants for landscape cards", () => {
    expect(Math.max(...widths("landscape"))).toBeGreaterThan(Math.max(...widths("portrait")));
  });

  test("describes the grid column in sizes", () => {
    expect(responsiveImage(cdnUrl, "portrait").sizes).toContain("14rem");
    expect(responsiveImage(cdnUrl, "landscape").sizes).toContain("28rem");
  });
});

describe("responsiveImage for the card page", () => {
  test("offers larger widths than the grid", () => {
    expect(Math.max(...widths("portrait", "detail"))).toBeGreaterThan(Math.max(...widths("portrait")));
  });

  test("describes the art column in sizes", () => {
    expect(responsiveImage(cdnUrl, "portrait", "detail").sizes).toContain("22rem");
    expect(responsiveImage(cdnUrl, "landscape", "detail").sizes).toContain("30rem");
  });
});
