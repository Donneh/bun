import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import SortControl from "./SortControl.vue";

const options = [
  { value: "set", label: "Set" },
  { value: "name", label: "Name" },
  { value: "cost", label: "Cost" },
];

const sortBy = () => screen.getByRole("combobox", { name: "Sort by" }) as HTMLSelectElement;
const direction = () => screen.getByRole("button", { name: /^Direction:/ });

describe("SortControl", () => {
  test("shows the current sort and direction", () => {
    render(SortControl, { props: { sort: "name", direction: "desc", options } });

    expect(sortBy().value).toBe("name");
    expect(direction().getAttribute("aria-label")).toBe("Direction: Descending");
    expect(direction().textContent).toContain("Desc");
    expect([...sortBy().options].map((option) => option.text)).toEqual(["Set", "Name", "Cost"]);
  });

  test("reports a new sort key with the current direction", async () => {
    const { emitted } = render(SortControl, { props: { sort: "set", direction: "desc", options } });

    await userEvent.selectOptions(sortBy(), "Cost");

    expect(emitted("change")).toEqual([[{ sort: "cost", direction: "desc" }]]);
  });

  test("flips the direction with the current sort key when the user presses the direction button", async () => {
    const { emitted } = render(SortControl, { props: { sort: "name", direction: "asc", options } });

    await userEvent.click(direction());

    expect(emitted("change")).toEqual([[{ sort: "name", direction: "desc" }]]);
  });

  test("flips a descending sort back to ascending", async () => {
    const { emitted } = render(SortControl, { props: { sort: "cost", direction: "desc", options } });

    await userEvent.click(direction());

    expect(emitted("change")).toEqual([[{ sort: "cost", direction: "asc" }]]);
  });
});
