import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import ExampleQueries from "./ExampleQueries.vue";

describe("ExampleQueries", () => {
  test("lists each query as a button", () => {
    render(ExampleQueries, { props: { queries: ["c:fury cost:<=2", "type:battlefield"] } });

    const list = screen.getByRole("list", { name: "Example queries" });
    expect(
      within(list)
        .getAllByRole("button")
        .map((button) => button.textContent?.replace("›", "").trim()),
    ).toEqual(["c:fury cost:<=2", "type:battlefield"]);
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
