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
const direction = () => screen.getByRole("combobox", { name: "Direction" }) as HTMLSelectElement;

describe("SortControl", () => {
  test("shows the current sort and direction", () => {
    render(SortControl, { props: { sort: "name", direction: "desc", options } });

    expect(sortBy().value).toBe("name");
    expect(direction().value).toBe("desc");
    expect([...sortBy().options].map((option) => option.text)).toEqual(["Set", "Name", "Cost"]);
  });

  test("reports a new sort key with the current direction", async () => {
    const { emitted } = render(SortControl, { props: { sort: "set", direction: "desc", options } });

    await userEvent.selectOptions(sortBy(), "Cost");

    expect(emitted("change")).toEqual([[{ sort: "cost", direction: "desc" }]]);
  });

  test("reports a new direction with the current sort key", async () => {
    const { emitted } = render(SortControl, { props: { sort: "name", direction: "asc", options } });

    await userEvent.selectOptions(direction(), "Descending");

    expect(emitted("change")).toEqual([[{ sort: "name", direction: "desc" }]]);
  });
});
