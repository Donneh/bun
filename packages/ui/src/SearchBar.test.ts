import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import { defineComponent, h, ref } from "vue";
import type { QuerySuggestion } from "./query-suggestion.ts";
import SearchBar from "./SearchBar.vue";

type Suggest = (query: string, caret: number) => { suggestions: QuerySuggestion[]; hint: string | null };

const none: Suggest = () => ({ suggestions: [], hint: null });

const rarities: Suggest = (query, caret) => {
  const start = query.lastIndexOf("r:", caret);
  if (start === -1 || query.slice(start, caret).includes(" ")) return { suggestions: [], hint: null };
  const prefix = query.slice(start + 2, caret);
  return {
    suggestions: ["rare", "epic"]
      .filter((value) => value.startsWith(prefix))
      .map((value) => ({ label: value, detail: null, text: `${value} `, span: { start: start + 2, end: caret } })),
    hint: "Rarity of the printing.",
  };
};

function renderSearchBar(initial = "", suggest: Suggest = none) {
  const query = ref(initial);
  const caret = ref(initial.length);
  const submitted: string[] = [];
  const Host = defineComponent(() => () => {
    const { suggestions, hint } = suggest(query.value, caret.value);
    return h(SearchBar, {
      modelValue: query.value,
      suggestions,
      hint,
      "onUpdate:modelValue": (value: string) => {
        query.value = value;
      },
      onCaret: (position: number) => {
        caret.value = position;
      },
      onSubmit: (value: string) => submitted.push(value),
    });
  });
  render(Host);
  return { query, submitted };
}

describe("SearchBar", () => {
  test("shows a labelled search box with the current query", () => {
    renderSearchBar("c:fury");

    expect(screen.getByRole("search")).toBeTruthy();
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

  test("Tab completes the value under the caret and keeps the rest of the query", async () => {
    const { query, submitted } = renderSearchBar("cost:2", rarities);

    await userEvent.type(screen.getByRole("searchbox"), " r:e");
    expect(screen.getByRole("option", { name: "epic" })).toBeTruthy();
    await userEvent.keyboard("{Tab}");

    expect(query.value).toBe("cost:2 r:epic ");
    expect(document.activeElement).toBe(screen.getByRole("searchbox"));
    expect(submitted).toEqual([]);
  });

  test("Enter applies a chosen suggestion instead of searching, then searches", async () => {
    const { query, submitted } = renderSearchBar("", rarities);

    await userEvent.type(screen.getByRole("searchbox"), "r:");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(query.value).toBe("r:epic ");
    expect(submitted).toEqual([]);

    await userEvent.keyboard("{Enter}");
    expect(submitted).toEqual(["r:epic"]);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  test("clicking a suggestion applies it", async () => {
    const { query } = renderSearchBar("", rarities);

    await userEvent.type(screen.getByRole("searchbox"), "r:");
    await userEvent.click(screen.getByRole("option", { name: "rare" }));

    expect(query.value).toBe("r:rare ");
  });

  test("Escape closes the suggestions until the user types again", async () => {
    renderSearchBar("", rarities);

    await userEvent.type(screen.getByRole("searchbox"), "r:");
    expect(screen.getByText("Rarity of the printing.")).toBeTruthy();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();

    await userEvent.keyboard("r");
    expect(screen.getByRole("option", { name: "rare" })).toBeTruthy();
  });
});
