import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CollectionControls from "./CollectionControls.vue";

const props = {
  code: "OGN-119/298",
  owned: 1,
  wishlisted: false,
  copiesOfCard: 2,
  ownedPrintings: 1,
  printingCount: 5,
  saved: true,
};

describe("CollectionControls", () => {
  test("shows the copies owned of the selected printing and a summary of the card", () => {
    render(CollectionControls, { props });

    const group = screen.getByRole("group", { name: "Copies of OGN-119/298" });
    expect(within(group).getByRole("status").textContent).toBe("1");
    expect(screen.getByText("2 copies in 1 of 5 printings")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Collection" })).toBeTruthy();
  });

  test("summarises a card that is not owned and a card with one printing", async () => {
    const { rerender } = render(CollectionControls, {
      props: { ...props, owned: 0, copiesOfCard: 0, ownedPrintings: 0 },
    });
    expect(screen.getByText("Not in your collection")).toBeTruthy();

    await rerender({ ...props, copiesOfCard: 1, printingCount: 1 });
    expect(screen.getByText("1 copy in your collection")).toBeTruthy();
  });

  test("reports one copy more or less", async () => {
    const { emitted } = render(CollectionControls, { props });

    await userEvent.click(screen.getByRole("button", { name: "Add a copy of OGN-119/298" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove a copy of OGN-119/298" }));

    expect(emitted("update:owned")).toEqual([[2], [1]]);
  });

  test("cannot go below zero or above the maximum", () => {
    const { unmount } = render(CollectionControls, { props: { ...props, owned: 0 } });
    expect(screen.getByRole("button", { name: /Remove a copy/ }).hasAttribute("disabled")).toBe(true);
    unmount();

    render(CollectionControls, { props: { ...props, owned: 3, max: 3 } });
    expect(screen.getByRole("button", { name: /Add a copy/ }).hasAttribute("disabled")).toBe(true);
  });

  test("toggles the wishlist with a pressed button", async () => {
    const { emitted, rerender } = render(CollectionControls, { props });

    const wishlist = screen.getByRole("button", { name: "Wishlist OGN-119/298", pressed: false });
    await userEvent.click(wishlist);
    expect(emitted("update:wishlisted")).toEqual([[true]]);

    await rerender({ ...props, wishlisted: true });
    expect(screen.getByRole("button", { name: "Wishlist OGN-119/298", pressed: true })).toBeTruthy();
  });

  test("says where the collection lives, and when the browser cannot keep it", async () => {
    const { rerender } = render(CollectionControls, { props });
    expect(screen.getByText("Saved in this browser only.")).toBeTruthy();

    await rerender({ ...props, saved: false });
    expect(screen.getByText(/blocks storage/)).toBeTruthy();
  });
});
