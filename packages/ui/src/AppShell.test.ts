import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import AppShell from "./AppShell.vue";

describe("AppShell", () => {
  test("shows the title as the page heading and the content in main", () => {
    render(AppShell, { props: { title: "Riftkeeper" }, slots: { default: "<p>Content</p>" } });

    expect(screen.getByRole("heading", { level: 1, name: "Riftkeeper" })).toBeTruthy();
    expect(screen.getByRole("main").textContent).toBe("Content");
  });
});
