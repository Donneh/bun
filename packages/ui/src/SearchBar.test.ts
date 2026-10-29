import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import { defineComponent, h, ref } from "vue";
import SearchBar from "./SearchBar.vue";

function renderSearchBar(initial = "") {
  const query = ref(initial);
  const submitted: string[] = [];
  const Host = defineComponent(
    () => () =>
      h(SearchBar, {
        modelValue: query.value,
        "onUpdate:modelValue": (value: string) => {
          query.value = value;
        },
        onSubmit: (value: string) => submitted.push(value),
      }),
  );
  render(Host);
  return { query, submitted };
}

describe("SearchBar", () => {
  test("shows a labelled search box with the current query", () => {
    renderSearchBar("c:fury");

    expect((screen.getByRole("searchbox", { name: "Search cards" }) as HTMLInputElement).value).toBe("c:fury");
  });

  test("submits the trimmed query when the user presses Enter", async () => {
    const { query, submitted } = renderSearchBar();

    await userEvent.type(screen.getByRole("searchbox"), "  cost:<=2 {Enter}");

    expect(query.value).toBe("  cost:<=2 ");
    expect(submitted).toEqual(["cost:<=2"]);
  });

  test("submits when the user clicks the search button", async () => {
    const { submitted } = renderSearchBar("jinx");

    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(submitted).toEqual(["jinx"]);
  });
});
