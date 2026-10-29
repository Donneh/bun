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
});
