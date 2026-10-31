import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardText from "./CardText.vue";

const TOKEN_NAMES: [token: string, name: string][] = [
  ...Array.from({ length: 13 }, (_, energy): [string, string] => [`:rb_energy_${energy}:`, `${energy} energy`]),
  [":rb_might:", "Might"],
  [":rb_exhaust:", "Exhaust"],
  [":rb_rune_fury:", "Fury rune"],
  [":rb_rune_calm:", "Calm rune"],
  [":rb_rune_mind:", "Mind rune"],
  [":rb_rune_body:", "Body rune"],
  [":rb_rune_chaos:", "Chaos rune"],
  [":rb_rune_order:", "Order rune"],
  [":rb_rune_rainbow:", "Rune of any domain"],
];

describe("CardText", () => {
  test.each(TOKEN_NAMES)("shows %s as a glyph named %s", (token, name) => {
    const { container } = render(CardText, { props: { text: `Pay ${token}.` } });

    const glyph = screen.getByRole("img", { name });
    expect(glyph.querySelector("svg path")).not.toBeNull();
    expect(container.textContent).toBe("Pay .");
  });

  test("names every glyph in a line of rules text in reading order", () => {
    render(CardText, { props: { text: ":rb_exhaust:, :rb_energy_2::rb_rune_order:: Give a unit +1 :rb_might:." } });

    expect(screen.getAllByRole("img").map((glyph) => glyph.getAttribute("aria-label"))).toEqual([
      "Exhaust",
      "2 energy",
      "Order rune",
      "Might",
    ]);
  });

  test("bolds keywords", () => {
    render(CardText, { props: { text: "[Ganking]" } });

    expect(screen.getByText("Ganking").tagName).toBe("STRONG");
  });

  test("keeps the gradient of each rainbow rune its own", () => {
    const { container } = render(CardText, { props: { text: ":rb_rune_rainbow: or :rb_rune_rainbow:" } });

    const ids = [...container.querySelectorAll("linearGradient")].map((gradient) => gradient.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    for (const path of container.querySelectorAll("path[fill^='url(']"))
      expect(ids).toContain(path.getAttribute("fill")?.slice("url(#".length, -1));
  });
});
