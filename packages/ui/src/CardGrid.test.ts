import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardGrid from "./CardGrid.vue";
import type { CardSummary } from "./card-summary.ts";

const cards: CardSummary[] = [
  {
    id: "jinx",
    name: "Jinx",
    subtitle: "Loose Cannon",
    imageUrl: "https://example.com/jinx.png",
    orientation: "portrait",
  },
  {
    id: "arena",
    name: "Grand Arena",
    subtitle: null,
    imageUrl: "https://example.com/arena.png",
    orientation: "landscape",
  },
];

describe("CardGrid", () => {
  test("shows one tile per card in order", () => {
    render(CardGrid, { props: { cards, label: "Search results" } });

    const tiles = within(screen.getByRole("list", { name: "Search results" })).getAllByRole("listitem");
    expect(tiles.map((tile) => within(tile).getByRole("img").getAttribute("alt"))).toEqual(["Jinx", "Grand Arena"]);
  });

  test("adds decorative placeholder tiles after the cards", () => {
    render(CardGrid, { props: { cards, label: "Search results", placeholders: 3 } });

    const items = within(screen.getByRole("list", { name: "Search results" })).getAllByRole("listitem", {
      hidden: true,
    });
    expect(items).toHaveLength(5);
    expect(items.slice(2).every((item) => item.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
  });
});
