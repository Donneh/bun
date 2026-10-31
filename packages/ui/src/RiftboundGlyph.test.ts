import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import { GLYPH_NAMES, glyphLabel } from "./glyph.ts";
import RiftboundGlyph from "./RiftboundGlyph.vue";

describe("RiftboundGlyph", () => {
  test.each(GLYPH_NAMES)("draws %s inline with its name", (name) => {
    render(RiftboundGlyph, { props: { name } });

    const glyph = screen.getByRole("img", { name: glyphLabel(name) });
    expect(glyph.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(glyph.querySelectorAll("svg path").length).toBeGreaterThan(0);
  });

  test("names card types and colorless in words", () => {
    const names = ["card_type_unit", "card_type_battlefield", "colorless"] as const;

    expect(names.map((name) => glyphLabel(name))).toEqual(["Unit", "Battlefield", "Colorless"]);
  });

  test("takes a label that says more than the glyph", () => {
    render(RiftboundGlyph, { props: { name: "rune_fury", label: "Fury power" } });

    expect(screen.getByRole("img", { name: "Fury power" })).toBeTruthy();
  });

  test("hides a decorative glyph from assistive technology", () => {
    const { container } = render(RiftboundGlyph, { props: { name: "might", decorative: true } });

    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("[aria-hidden='true'] svg")).not.toBeNull();
  });

  test("draws single-color glyphs in the text color", () => {
    for (const name of ["might", "exhaust", "colorless", "card_type_gear"] as const) {
      const { container, unmount } = render(RiftboundGlyph, { props: { name } });
      const paints = [...container.querySelectorAll("path")].flatMap((path) =>
        [path.getAttribute("fill"), path.getAttribute("stroke")].filter((paint) => paint !== null),
      );
      expect(new Set(paints)).toEqual(new Set(["currentColor"]));
      unmount();
    }
  });
});
