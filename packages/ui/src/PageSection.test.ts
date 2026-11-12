import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import PageSection from "./PageSection.vue";

describe("PageSection", () => {
  test("is a region named by its heading, with its detail and content", () => {
    render(PageSection, { props: { title: "Wishlist", detail: "3 printings" }, slots: { default: "<p>Cards</p>" } });

    const region = screen.getByRole("region", { name: "Wishlist" });
    expect(region.querySelector("h2")?.textContent).toBe("Wishlist");
    expect(screen.getByText("3 printings")).toBeTruthy();
    expect(screen.getByText("Cards")).toBeTruthy();
  });
});
