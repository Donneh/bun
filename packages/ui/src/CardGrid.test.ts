import userEvent from "@testing-library/user-event";
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
    href: "/cards/jinx",
  },
  {
    id: "arena",
    name: "Grand Arena",
    subtitle: null,
    imageUrl: "https://example.com/arena.png",
    orientation: "landscape",
    href: "/cards/arena",
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

  test("reports the card a reader opens", async () => {
    const { emitted } = render(CardGrid, { props: { cards, label: "Search results" } });

    await userEvent.click(screen.getByRole("link", { name: "Grand Arena" }));

    expect(emitted("navigate")).toEqual([["/cards/arena"]]);
  });

  test("marks stale cards as busy and keeps showing them", () => {
    render(CardGrid, { props: { cards, label: "Search results", stale: true } });

    const list = screen.getByRole("list", { name: "Search results" });
    expect(list.getAttribute("aria-busy")).toBe("true");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  test("is not busy with current cards", () => {
    render(CardGrid, { props: { cards, label: "Search results" } });

    expect(screen.getByRole("list", { name: "Search results" }).getAttribute("aria-busy")).toBe("false");
  });
});
