import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CollectionOverview from "./CollectionOverview.vue";

const totals = { copies: 12, printings: 8, wishlist: 1 };

describe("CollectionOverview", () => {
  test("titles the page and totals the copies, printings and wishlist", () => {
    render(CollectionOverview, { props: { totals, storage: "saved" as const } });

    expect(screen.getByRole("heading", { level: 1, name: "Collection" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("12 copies of 8 printings · 1 printing on the wishlist");
    expect(screen.getByText("Saved in this browser only.")).toBeTruthy();
  });

  test("shows the value with its source when there is one", () => {
    render(CollectionOverview, {
      props: {
        totals,
        storage: "saved" as const,
        value: { amount: "$13.00", source: "TCGplayer market prices, 31 Oct 2026" },
      },
    });

    expect(screen.getByText("$13.00")).toBeTruthy();
    expect(screen.getByText("TCGplayer market prices, 31 Oct 2026")).toBeTruthy();
  });

  test("mentions printings the card list does not know", () => {
    render(CollectionOverview, { props: { totals, storage: "saved" as const, unknown: 2 } });

    expect(screen.getByText("2 printings in this collection are not in the card list.")).toBeTruthy();
  });

  test("warns when the browser blocks storage", () => {
    render(CollectionOverview, { props: { totals, storage: "blocked" as const } });

    expect(screen.getByText(/blocks storage/)).toBeTruthy();
  });
});
