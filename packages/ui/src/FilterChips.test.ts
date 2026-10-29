import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import FilterChips from "./FilterChips.vue";
import type { FilterChipSummary } from "./filter-chip.ts";

const chips: FilterChipSummary[] = [
  { id: "0-6", label: "Domain", value: "Fury", removable: true },
  { id: "7-14", label: "Cost", value: "≤ 2", removable: false },
];

describe("FilterChips", () => {
  test("shows each filter with its label and value", () => {
    render(FilterChips, { props: { chips } });

    const items = within(screen.getByRole("list", { name: "Filters" })).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("DomainFury"),
      expect.stringContaining("Cost≤ 2"),
    ]);
  });

  test("offers removal only for removable filters", () => {
    render(FilterChips, { props: { chips } });

    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Remove Domain Fury",
    ]);
  });

  test("reports which filter the user removes", async () => {
    const { emitted } = render(FilterChips, { props: { chips } });

    await userEvent.click(screen.getByRole("button", { name: "Remove Domain Fury" }));

    expect(emitted("remove")).toEqual([["0-6"]]);
  });

  test("mentions conditions that have no chip", () => {
    render(FilterChips, { props: { chips, moreConditions: true } });

    expect(screen.getByText("Plus other conditions in the query")).toBeTruthy();
  });

  test("renders nothing without filters", () => {
    const { container } = render(FilterChips, { props: { chips: [], moreConditions: true } });

    expect(container.textContent).toBe("");
  });
});
