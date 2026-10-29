import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardTile from "./CardTile.vue";

describe("CardTile", () => {
  test("shows the card image, name and subtitle", () => {
    render(CardTile, {
      props: {
        name: "Jinx",
        subtitle: "Loose Cannon",
        imageUrl: "https://example.com/jinx.png",
        orientation: "portrait",
      },
    });

    expect(screen.getByRole("img", { name: "Jinx" }).getAttribute("src")).toBe("https://example.com/jinx.png");
    expect(screen.getByText("Jinx")).toBeTruthy();
    expect(screen.getByText("Loose Cannon")).toBeTruthy();
  });

  test("passes responsive image candidates to the browser", () => {
    render(CardTile, {
      props: {
        name: "Jinx",
        subtitle: null,
        imageUrl: "https://example.com/jinx.png",
        orientation: "portrait",
        srcset: "https://example.com/jinx-240.webp 240w, https://example.com/jinx-480.webp 480w",
        sizes: "14rem",
      },
    });

    const image = screen.getByRole("img", { name: "Jinx" });
    expect(image.getAttribute("srcset")).toBe(
      "https://example.com/jinx-240.webp 240w, https://example.com/jinx-480.webp 480w",
    );
    expect(image.getAttribute("sizes")).toBe("14rem");
    expect(image.getAttribute("src")).toBe("https://example.com/jinx.png");
  });

  test("renders a plain image without responsive props", () => {
    render(CardTile, {
      props: { name: "Jinx", subtitle: null, imageUrl: "https://example.com/jinx.png", orientation: "portrait" },
    });

    const image = screen.getByRole("img", { name: "Jinx" });
    expect(image.hasAttribute("srcset")).toBe(false);
    expect(image.hasAttribute("sizes")).toBe(false);
  });

  test("leaves out a missing subtitle", () => {
    render(CardTile, {
      props: { name: "Abandon", subtitle: null, imageUrl: "https://example.com/abandon.png", orientation: "portrait" },
    });

    expect(screen.getByRole("figure").querySelector("figcaption")?.textContent?.trim()).toBe("Abandon");
  });
});
