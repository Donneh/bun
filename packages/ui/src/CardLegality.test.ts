import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardLegality from "./CardLegality.vue";
import type { LegalityRow } from "./card-detail.ts";

const announcement = "https://playriftbound.com/en-us/news/announcements/july-ban-list-updates";
const rows: LegalityRow[] = [
  { format: "Standard", status: "legal", label: "Legal" },
  {
    format: "2v2 Constructed",
    status: "banned",
    label: "Banned",
    source: { label: "July Ban List Updates", href: announcement },
  },
  { format: "Sealed", status: "legal", label: "Legal", note: "No ban list" },
];

describe("CardLegality", () => {
  test("pairs each format with its status, note and the announcement behind a ban", () => {
    render(CardLegality, { props: { rows } });

    const region = screen.getByRole("region", { name: "Legality" });
    const terms = within(region)
      .getAllByRole("term")
      .map((term) => term.textContent);
    const definitions = within(region)
      .getAllByRole("definition")
      .map((definition) => [...definition.children].map((part) => part.textContent));
    expect(terms).toEqual(["Standard", "2v2 Constructed", "Sealed"]);
    expect(definitions).toEqual([["Legal"], ["Banned", "July Ban List Updates"], ["Legal", "No ban list"]]);
    expect(within(region).getByRole("link", { name: "July Ban List Updates" }).getAttribute("href")).toBe(announcement);
  });
});
