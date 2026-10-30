import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import ExampleQueries from "./ExampleQueries.vue";

describe("ExampleQueries", () => {
  test("lists each query as a button after the lead", () => {
    const { container } = render(ExampleQueries, { props: { queries: ["c:fury cost:<=2", "type:battlefield"] } });

    const list = screen.getByRole("list", { name: "Example queries" });
    expect(
      within(list)
        .getAllByRole("button")
        .map((button) => button.textContent?.trim()),
    ).toEqual(["c:fury cost:<=2", "type:battlefield"]);
    expect(container.textContent).toMatch(/^\s*Try ›/);
  });

  test("takes another lead", () => {
    const { container } = render(ExampleQueries, { props: { queries: ["ability:draw"], lead: "For example" } });

    expect(container.textContent).toMatch(/^\s*For example ›/);
  });

  test("reports the clicked query", async () => {
    const { emitted } = render(ExampleQueries, { props: { queries: ["c:fury cost:<=2", "type:battlefield"] } });

    await userEvent.click(screen.getByRole("button", { name: "Search type:battlefield" }));

    expect(emitted("select")).toEqual([["type:battlefield"]]);
  });

  test("renders nothing without queries", () => {
    render(ExampleQueries, { props: { queries: [] } });

    expect(screen.queryByRole("list")).toBeNull();
  });
});
