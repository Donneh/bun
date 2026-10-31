import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import AppShell from "./AppShell.vue";

describe("AppShell", () => {
  test("shows the content in main without a header bar", () => {
    render(AppShell, { slots: { default: "<p>Content</p>" } });

    expect(screen.getByRole("main").textContent).toBe("Content");
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });

  test("puts the header before main and the backdrop behind both", () => {
    const { container } = render(AppShell, {
      slots: {
        default: "<p>Content</p>",
        header: "<header>Navbar</header>",
        backdrop: '<div class="backdrop" aria-hidden="true"></div>',
      },
    });

    const shell = container.firstElementChild;
    expect([...(shell?.children ?? [])].map((child) => child.tagName)).toEqual(["DIV", "HEADER", "MAIN"]);
    expect(screen.getByRole("banner").textContent).toBe("Navbar");
  });

  test("gives the page a heading for assistive technology when it has a title", () => {
    render(AppShell, { props: { title: "Card not found" }, slots: { default: "<p>Content</p>" } });

    expect(screen.getByRole("heading", { level: 1, name: "Card not found" })).toBeTruthy();
  });

  test("shows the footer after main", () => {
    render(AppShell, { slots: { default: "<p>Content</p>", footer: "<footer>Notice</footer>" } });

    const footer = screen.getByRole("contentinfo");
    expect(footer.textContent).toBe("Notice");
    expect(screen.getByRole("main").compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
