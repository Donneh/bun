import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import SiteFooter from "./SiteFooter.vue";

describe("SiteFooter", () => {
  test("shows the notice in the page footer", () => {
    const notice = "Riot Games does not endorse or sponsor this project.";
    render(SiteFooter, { props: { notice } });

    expect(screen.getByRole("contentinfo").textContent).toBe(notice);
  });
});
