import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import ResultSummary from "./ResultSummary.vue";

describe("ResultSummary", () => {
  test("says when only the first page is shown", () => {
    render(ResultSummary, { props: { shown: 40, total: 312 } });

    expect(screen.getByText("Showing 40 of 312 cards")).toBeTruthy();
  });

  test("gives the total when every card is shown", () => {
    render(ResultSummary, { props: { shown: 1, total: 1 } });

    expect(screen.getByText("1 card")).toBeTruthy();
  });

  test("says it is searching in the same place", () => {
    render(ResultSummary, { props: { shown: 40, total: 312, searching: true } });

    expect(screen.getByRole("status").textContent).toBe("Searching…");
  });

  test("says it is searching before the first count is known", () => {
    render(ResultSummary);

    expect(screen.getByRole("status").textContent).toBe("Searching…");
  });

  test("groups thousands", () => {
    render(ResultSummary, { props: { shown: 1080, total: 1103 } });

    expect(screen.getByText("Showing 1,080 of 1,103 cards")).toBeTruthy();
  });

  test("announces a new count to screen readers", () => {
    render(ResultSummary, { props: { shown: 80, total: 312 } });

    expect(screen.getByText("Showing 80 of 312 cards").getAttribute("aria-live")).toBe("polite");
  });
});
