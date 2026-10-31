import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import PreviewBanner from "./PreviewBanner.vue";

describe("PreviewBanner", () => {
  test("marks the page as a preview and links the pull request", () => {
    render(PreviewBanner, {
      props: { label: "Pull request #73", href: "https://github.com/owner/repo/pull/73" },
    });

    const banner = screen.getByRole("complementary", { name: "Preview" });
    expect(banner.textContent).toContain("Preview");
    expect(screen.getByRole("link", { name: "Pull request #73" }).getAttribute("href")).toBe(
      "https://github.com/owner/repo/pull/73",
    );
  });

  test("shows the label as text without a link", () => {
    render(PreviewBanner, { props: { label: "Local build" } });

    expect(screen.getByRole("complementary", { name: "Preview" }).textContent).toContain("Local build");
    expect(screen.queryByRole("link")).toBeNull();
  });
});
