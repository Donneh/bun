import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardFacts from "./CardFacts.vue";

describe("CardFacts", () => {
  test("lists each fact as a labelled term", () => {
    const { container } = render(CardFacts, {
      props: {
        facts: [
          { label: "Type", value: [{ kind: "text", text: "Unit · Champion" }] },
          { label: "Might", value: [{ kind: "text", text: "3" }] },
        ],
      },
    });

    const terms = [...container.querySelectorAll("dt")].map((term) => term.textContent);
    const values = [...container.querySelectorAll("dd")].map((value) => value.textContent?.trim());
    expect(terms).toEqual(["Type", "Might"]);
    expect(values).toEqual(["Unit · Champion", "3"]);
  });

  test("puts a decorative glyph before the words it illustrates", () => {
    const { container } = render(CardFacts, {
      props: {
        facts: [
          {
            label: "Domain",
            value: [
              { kind: "glyph", name: "rune_fury", decorative: true },
              { kind: "text", text: "Fury" },
            ],
          },
        ],
      },
    });

    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("dd [aria-hidden='true'] svg")).not.toBeNull();
    expect(container.querySelector("dd")?.textContent).toBe("Fury");
  });

  test("names a glyph that stands for its value", () => {
    render(CardFacts, {
      props: {
        facts: [
          {
            label: "Cost",
            value: [
              { kind: "glyph", name: "energy_3" },
              { kind: "text", text: " · 1 " },
              { kind: "glyph", name: "rune_calm", label: "Calm power" },
            ],
          },
        ],
      },
    });

    expect(screen.getAllByRole("img").map((glyph) => glyph.getAttribute("aria-label"))).toEqual([
      "3 energy",
      "Calm power",
    ]);
  });

  test("renders rules text with its symbols", () => {
    render(CardFacts, {
      props: { facts: [{ label: "Ability", rulesText: "[Equip] Pay :rb_energy_1:." }] },
    });

    expect(screen.getByText("Equip").tagName).toBe("STRONG");
    expect(screen.getByRole("img", { name: "1 energy" })).toBeTruthy();
  });

  test("renders nothing without facts", () => {
    const { container } = render(CardFacts, { props: { facts: [] } });

    expect(container.querySelector("dl")).toBeNull();
  });
});
