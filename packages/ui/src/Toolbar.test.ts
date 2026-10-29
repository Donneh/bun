import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import Toolbar from "./Toolbar.vue";

describe("Toolbar", () => {
  test("shows its content", () => {
    render(Toolbar, { slots: { default: "<p>40 cards</p><button>Sort</button>" } });

    expect(screen.getByText("40 cards")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sort" })).toBeTruthy();
  });
});
