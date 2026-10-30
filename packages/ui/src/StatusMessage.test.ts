import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/vue";
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
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("offers an action, such as a retry, and reports a click on it", async () => {
    const { emitted } = render(StatusMessage, {
      props: { kind: "error", title: "Could not load more cards", action: "Try again" },
    });

    await userEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Try again" }));

    expect(emitted("action")).toHaveLength(1);
  });

  test("renders extra content, such as suggestions, below the detail", () => {
    render(StatusMessage, {
      props: { kind: "empty", title: "Try a query" },
      slots: { default: "<p>Suggestions</p>" },
    });

    expect(screen.getByRole("status").textContent).toContain("Suggestions");
  });
});
