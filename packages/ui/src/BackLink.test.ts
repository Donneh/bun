import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import BackLink from "./BackLink.vue";

describe("BackLink", () => {
  test("links back to the results by default", () => {
    render(BackLink, { props: { href: "/?q=c%3Afury" } });

    expect(screen.getByRole("link", { name: "Back to results" }).getAttribute("href")).toBe("/?q=c%3Afury");
  });

  test("takes its own label", () => {
    render(BackLink, { props: { href: "/", label: "Back to search" } });

    expect(screen.getByRole("link", { name: "Back to search" })).toBeTruthy();
  });

  test("reports a plain click and leaves a modified click to the browser", async () => {
    const { emitted } = render(BackLink, { props: { href: "/" } });
    const link = screen.getByRole("link");

    await fireEvent.click(link, { metaKey: true });
    await userEvent.click(link);

    expect(emitted("navigate")).toEqual([["/"]]);
  });
});
