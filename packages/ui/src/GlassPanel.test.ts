import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import GlassPanel from "./GlassPanel.vue";

describe("GlassPanel", () => {
  test("wraps its content in a frosted surface", () => {
    const { container } = render(GlassPanel, { slots: { default: "<p>Rules</p>" } });

    const panel = container.firstElementChild;
    expect(panel?.tagName).toBe("DIV");
    expect(panel?.classList.contains("rk-glass")).toBe(true);
    expect(screen.getByText("Rules")).toBeTruthy();
  });

  test("renders as the element it is given", () => {
    render(GlassPanel, { props: { tag: "article" }, slots: { default: "<h1>Akali</h1>" } });

    expect(screen.getByRole("article").textContent).toBe("Akali");
  });
});
