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

  test("shows the footer after main", () => {
    render(AppShell, { slots: { default: "<p>Content</p>", footer: "<footer>Notice</footer>" } });

    const footer = screen.getByRole("contentinfo");
    expect(footer.textContent).toBe("Notice");
    expect(screen.getByRole("main").compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
