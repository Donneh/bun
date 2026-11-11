import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/vue";
import { expect, test } from "vitest";
import SearchViewControl from "./SearchViewControl.vue";

test("shows and changes the result view", async () => {
  const { emitted, rerender } = render(SearchViewControl, { props: { view: "printings" } });
  expect(screen.getByRole("button", { name: "Printings" }).getAttribute("aria-pressed")).toBe("true");
  await userEvent.click(screen.getByRole("button", { name: "Cards" }));
  expect(emitted("change")).toEqual([["cards"]]);
  await rerender({ view: "cards" });
  expect(screen.getByRole("button", { name: "Cards" }).getAttribute("aria-pressed")).toBe("true");
  await userEvent.tab();
  await userEvent.keyboard("{Enter}");
  expect(emitted("change")).toEqual([["cards"], ["printings"]]);
});
