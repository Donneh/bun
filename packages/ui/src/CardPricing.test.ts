import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardPricing from "./CardPricing.vue";
import type { PricingContent } from "./card-detail.ts";

const pricing: PricingContent = {
  finishes: [
    {
      finish: "Normal",
      market: "$0.10",
      range: [
        { label: "Low", amount: "$0.01" },
        { label: "High", amount: "$5.11" },
      ],
    },
    { finish: "Foil", market: null, range: [{ label: "High", amount: "$99.00" }] },
  ],
  attribution: "Prices: TCGplayer market price via TCGCSV, updated Oct 31, 2026",
};

describe("CardPricing", () => {
  test("shows each finish with its market price and its low and high under a heading", () => {
    render(CardPricing, { props: { pricing } });

    const region = screen.getByRole("region", { name: "Market price" });
    const [normal, foil] = within(region).getAllByRole("listitem");
    expect(normal?.textContent).toContain("Normal");
    expect(within(normal as HTMLElement).getByText("$0.10")).toBeTruthy();
    expect(within(normal as HTMLElement).getByText("Low").nextElementSibling?.textContent).toBe("$0.01");
    expect(within(normal as HTMLElement).getByText("High").nextElementSibling?.textContent).toBe("$5.11");
    expect(foil?.textContent).toContain("Foil");
    expect(within(foil as HTMLElement).queryByText("Low")).toBeNull();
  });

  test("shows nothing for a missing market price", () => {
    render(CardPricing, { props: { pricing } });

    const foil = screen.getAllByRole("listitem")[1] as HTMLElement;
    expect(foil.textContent).not.toMatch(/\$0\.00|—/);
    expect(foil.querySelector("strong")).toBeNull();
  });

  test("credits the source and the date of the prices", () => {
    render(CardPricing, { props: { pricing } });

    expect(screen.getByText("Prices: TCGplayer market price via TCGCSV, updated Oct 31, 2026")).toBeTruthy();
  });
});
