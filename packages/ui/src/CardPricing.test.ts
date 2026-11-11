import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardPricing from "./CardPricing.vue";
import type { FinishPricing, PricingContent } from "./card-detail.ts";

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

  test("shows the change and a sparkline for a finish with a trend, and neither without one", () => {
    const trend = {
      change: "▲ 12.5%",
      period: "30 days",
      description: "Up 12.5% in 30 days",
      values: [1, 1.1, null, 1.125],
    };
    const [normal, foil] = pricing.finishes as [FinishPricing, FinishPricing];
    render(CardPricing, { props: { pricing: { ...pricing, finishes: [{ ...normal, trend }, foil] } } });

    const [withTrend, withoutTrend] = screen.getAllByRole("listitem") as [HTMLElement, HTMLElement];
    expect(within(withTrend).getByRole("img", { name: "Up 12.5% in 30 days" })).toBeTruthy();
    expect(withTrend.textContent).toContain("▲ 12.5%");
    expect(withTrend.textContent).toContain("30 days");
    expect(within(withoutTrend).queryByRole("img")).toBeNull();
  });

  test("credits the source and the date of the prices", () => {
    render(CardPricing, { props: { pricing } });

    expect(screen.getByText("Prices: TCGplayer market price via TCGCSV, updated Oct 31, 2026")).toBeTruthy();
  });
});
