import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import LoadMoreButton from "./LoadMoreButton.vue";

describe("LoadMoreButton", () => {
  test("asks for the next page when clicked", async () => {
    const { emitted } = render(LoadMoreButton, { props: { loading: false } });

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(emitted("load")).toHaveLength(1);
  });

  test("is disabled while the next page loads", () => {
    render(LoadMoreButton, { props: { loading: true } });

    const button = screen.getByRole("button", { name: "Loading…" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });
});
