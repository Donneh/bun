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
});
