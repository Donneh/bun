import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import StatusMessage from "./StatusMessage.vue";

describe("StatusMessage", () => {
  test("announces loading as a busy status", () => {
    render(StatusMessage, { props: { kind: "loading", title: "Searching…" } });

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Searching…");
    expect(status.getAttribute("aria-busy")).toBe("true");
  });

  test("shows an empty result with its detail", () => {
    render(StatusMessage, { props: { kind: "empty", title: "No cards found", detail: "Try a broader query." } });

    expect(screen.getByRole("status").textContent).toContain("No cards found");
    expect(screen.getByText("Try a broader query.")).toBeTruthy();
  });

  test("announces an error as an alert", () => {
    render(StatusMessage, { props: { kind: "error", title: "Search failed", detail: "Server error" } });

    expect(screen.getByRole("alert").textContent).toContain("Search failed");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
