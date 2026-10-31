import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import { defineComponent, h, ref } from "vue";
import SiteNavbar from "./SiteNavbar.vue";
import type { ThemePreference } from "./theme.ts";

function renderNavbar(initialQuery = "") {
  const query = ref(initialQuery);
  const theme = ref<ThemePreference>("system");
  const searches: string[] = [];
  const navigations: string[] = [];
  const Host = defineComponent(
    () => () =>
      h("div", [
        h("input", { "aria-label": "Other field" }),
        h(SiteNavbar, {
          links: [{ label: "Cards", href: "/", current: true }],
          modelValue: query.value,
          "onUpdate:modelValue": (value: string) => {
            query.value = value;
          },
          theme: theme.value,
          "onUpdate:theme": (value: ThemePreference) => {
            theme.value = value;
          },
          onSearch: (value: string) => searches.push(value),
          onNavigate: (href: string) => navigations.push(href),
        }),
      ]),
  );
  render(Host);
  return { query, theme, searches, navigations };
}

const searchField = () => screen.getByRole("searchbox", { name: "Search cards" });

describe("SiteNavbar", () => {
  test("shows the brand, the search field, the links and the theme button in a site navigation", () => {
    renderNavbar();

    const nav = screen.getByRole("navigation", { name: "Site" });
    expect(nav.contains(screen.getByRole("link", { name: "Riftkeeper" }))).toBe(true);
    expect(nav.contains(searchField())).toBe(true);
    expect(screen.getByRole("link", { name: "Cards" }).getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("button", { name: "Theme: system" })).toBeTruthy();
    expect(searchField().getAttribute("aria-keyshortcuts")).toBe("/");
  });

  test("reports a trimmed search when the field is submitted", async () => {
    const { query, searches } = renderNavbar();

    await userEvent.type(searchField(), "  c:fury {enter}");

    expect(query.value).toBe("  c:fury ");
    expect(searches).toEqual(["c:fury"]);
  });

  test("reports plain clicks on the brand and links and leaves modified clicks to the browser", async () => {
    const { navigations } = renderNavbar();

    await fireEvent.click(screen.getByRole("link", { name: "Cards" }), { ctrlKey: true });
    await userEvent.click(screen.getByRole("link", { name: "Cards" }));
    await userEvent.click(screen.getByRole("link", { name: "Riftkeeper" }));

    expect(navigations).toEqual(["/", "/"]);
  });

  test("focuses the search field when / is pressed anywhere on the page", async () => {
    renderNavbar();

    await userEvent.keyboard("/");

    expect(document.activeElement).toBe(searchField());
    expect((searchField() as HTMLInputElement).value).toBe("");
  });

  test("leaves / alone while the reader is typing in another field", async () => {
    renderNavbar();
    const other = screen.getByRole("textbox", { name: "Other field" });

    await userEvent.type(other, "a/b");

    expect(document.activeElement).toBe(other);
    expect((other as HTMLInputElement).value).toBe("a/b");
  });

  test("ignores / with a modifier key", async () => {
    renderNavbar();

    await userEvent.keyboard("{Control>}/{/Control}");

    expect(document.activeElement).not.toBe(searchField());
  });

  test("opens the collapsed phone search from its button and closes it with Escape", async () => {
    renderNavbar();
    const header = screen.getByRole("banner");

    await userEvent.click(screen.getByRole("button", { name: "Search cards" }));
    expect(header.classList.contains("searching")).toBe(true);
    expect(document.activeElement).toBe(searchField());

    await userEvent.keyboard("{Escape}");
    expect(header.classList.contains("searching")).toBe(false);
  });

  test("leaves out its search, the phone search button and the / shortcut on a page with its own search", async () => {
    render(SiteNavbar, { props: { theme: "system", searchable: false, links: [{ label: "Cards", href: "/" }] } });

    expect(screen.queryByRole("search")).toBeNull();
    expect(screen.queryByRole("button", { name: "Search cards" })).toBeNull();
    expect(screen.getByRole("link", { name: "Cards" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Theme: / })).toBeTruthy();

    await userEvent.keyboard("/");

    expect(document.activeElement).toBe(document.body);
  });

  test("stops listening for / when unmounted", async () => {
    const { unmount } = render(SiteNavbar, { props: { theme: "system" } });
    unmount();

    await userEvent.keyboard("/");

    expect(document.activeElement).toBe(document.body);
  });
});
