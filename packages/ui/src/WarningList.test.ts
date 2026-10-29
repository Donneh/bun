import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import WarningList from "./WarningList.vue";

describe("WarningList", () => {
  test("lists every warning message", () => {
    render(WarningList, {
      props: { warnings: [{ message: 'Unknown keyword "foo" was ignored.' }, { message: "Second warning." }] },
    });

    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(screen.getByRole("list", { name: "Search warnings" })).toBeTruthy();
    expect(items).toEqual(['Unknown keyword "foo" was ignored.', "Second warning."]);
  });

  test("renders nothing without warnings", () => {
    render(WarningList, { props: { warnings: [] } });

    expect(screen.queryByRole("list")).toBeNull();
  });
});
