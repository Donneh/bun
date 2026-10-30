import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardFacts from "./CardFacts.vue";

describe("CardFacts", () => {
  test("lists each fact as a labelled term", () => {
    const { container } = render(CardFacts, {
      props: {
        facts: [
          { label: "Type", value: "Unit · Champion" },
          { label: "Might", value: "3" },
        ],
      },
    });

    const terms = [...container.querySelectorAll("dt")].map((term) => term.textContent);
    const values = [...container.querySelectorAll("dd")].map((value) => value.textContent?.trim());
    expect(terms).toEqual(["Type", "Might"]);
    expect(values).toEqual(["Unit · Champion", "3"]);
  });

  test("renders rules text with its symbols", () => {
    render(CardFacts, {
      props: { facts: [{ label: "Ability", value: "[Equip] Pay :rb_energy_1:.", rulesText: true }] },
    });

    expect(screen.getByText("Equip").tagName).toBe("STRONG");
    expect(screen.getByRole("img", { name: "1 energy" }).textContent).toBe("1");
  });

  test("renders nothing without facts", () => {
    const { container } = render(CardFacts, { props: { facts: [] } });

    expect(container.querySelector("dl")).toBeNull();
  });
});
