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

  test("leaves out a missing subtitle", () => {
    render(CardTile, {
      props: { name: "Abandon", subtitle: null, imageUrl: "https://example.com/abandon.png", orientation: "portrait" },
    });

    expect(screen.getByRole("figure").querySelector("figcaption")?.textContent?.trim()).toBe("Abandon");
  });
});
