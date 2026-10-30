import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import Hero from "./Hero.vue";

describe("Hero", () => {
  test("shows the eyebrow and keeps the headline as the page heading and the subtitle for assistive technology", () => {
    render(Hero, {
      props: {
        eyebrow: "Riftkeeper · 1,103 cards · updated nightly",
        title: "Search the whole set. Instantly.",
        subtitle: "Find cards by name.",
      },
    });

    expect(screen.getByText("Riftkeeper · 1,103 cards · updated nightly")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Search the whole set. Instantly." })).toBeTruthy();
    expect(screen.getByText("Find cards by name.")).toBeTruthy();
  });

  test("leaves out a missing subtitle and keeps its dither decorative", () => {
    const { container } = render(Hero, { props: { eyebrow: "Riftkeeper", title: "Search" } });

    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
  });
});
