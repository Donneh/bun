import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import Toolbar from "./Toolbar.vue";

describe("Toolbar", () => {
  test("shows its content", () => {
    render(Toolbar, { slots: { default: "<p>40 cards</p><button>Sort</button>" } });

    expect(screen.getByText("40 cards")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sort" })).toBeTruthy();
  });

  test("groups the actions so they stay together when the summary changes width", () => {
    const { container } = render(Toolbar, {
      slots: { default: "<p>40 cards</p>", actions: "<button>View</button><button>Sort</button>" },
    });

    const actions = screen.getByRole("button", { name: "View" }).parentElement;
    expect(actions?.parentElement).toBe(container.firstElementChild);
    expect(screen.getByRole("button", { name: "Sort" }).parentElement).toBe(actions);
  });
});
