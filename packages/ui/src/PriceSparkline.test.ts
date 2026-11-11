import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import PriceSparkline from "./PriceSparkline.vue";

const days = [
  { date: "Nov 8", amount: 1, price: "$1.00" },
  { date: "Nov 9", amount: null, price: null },
  { date: "Nov 10", amount: 2, price: "$2.00" },
];

const chart = () => screen.getByRole("slider", { name: "Up 100% in 2 days" });
const tooltip = () => document.querySelector(".tooltip")?.textContent ?? null;
const spoken = () => chart().getAttribute("aria-valuetext");

function pointAt(element: HTMLElement, fraction: number, pointerType = "mouse") {
  element.getBoundingClientRect = () => ({ left: 0, width: 120, top: 0, height: 32 }) as DOMRect;
  return fireEvent.pointerMove(element, { clientX: fraction * 120, pointerType });
}

describe("PriceSparkline", () => {
  test("shows no tooltip until a day is chosen, and reads out the newest day", () => {
    render(PriceSparkline, { props: { days, label: "Up 100% in 2 days" } });

    expect(tooltip()).toBeNull();
    expect(spoken()).toBe("Nov 10 · $2.00");
  });

  test("shows the date and price of the day under the pointer, and hides it when the mouse leaves", async () => {
    render(PriceSparkline, { props: { days, label: "Up 100% in 2 days" } });

    await pointAt(chart(), 0.1);
    expect(tooltip()).toBe("Nov 8 · $1.00");

    await pointAt(chart(), 0.9);
    expect(tooltip()).toBe("Nov 10 · $2.00");

    await fireEvent.pointerLeave(chart(), { pointerType: "mouse" });
    expect(tooltip()).toBeNull();
  });

  test("says when a day has no price and marks no point for it", async () => {
    render(PriceSparkline, { props: { days, label: "Up 100% in 2 days" } });

    await pointAt(chart(), 0.5);

    expect(tooltip()).toBe("Nov 9 · No price");
    expect(document.querySelector(".dot")).toBeNull();
  });

  test("keeps a tapped day shown after the finger lifts", async () => {
    render(PriceSparkline, { props: { days, label: "Up 100% in 2 days" } });

    await pointAt(chart(), 0.1, "touch");
    await fireEvent.pointerLeave(chart(), { pointerType: "touch" });

    expect(tooltip()).toBe("Nov 8 · $1.00");
  });

  test("is a slider over the days: it starts at the newest day and steps with the arrow keys", async () => {
    render(PriceSparkline, { props: { days, label: "Up 100% in 2 days" } });

    await userEvent.tab();
    expect(document.activeElement).toBe(chart());
    expect(tooltip()).toBe("Nov 10 · $2.00");
    expect(chart().getAttribute("aria-valuenow")).toBe("2");

    await userEvent.keyboard("{ArrowLeft}");
    expect(spoken()).toBe("Nov 9 · No price");

    await userEvent.keyboard("{Home}");
    expect(spoken()).toBe("Nov 8 · $1.00");

    await userEvent.keyboard("{ArrowLeft}");
    expect(chart().getAttribute("aria-valuenow")).toBe("0");

    await userEvent.keyboard("{End}");
    expect(spoken()).toBe("Nov 10 · $2.00");

    await userEvent.tab();
    expect(tooltip()).toBeNull();
  });
});
