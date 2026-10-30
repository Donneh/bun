import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardDetail from "./CardDetail.vue";
import CardDetailSkeleton from "./CardDetailSkeleton.vue";
import CardHeading from "./CardHeading.vue";

describe("CardDetail", () => {
  test("puts the art before the details", () => {
    render(CardDetail, {
      props: { orientation: "landscape" },
      slots: { art: '<img alt="Grand Arena" src="https://example.com/arena.png" />', default: "<p>Details</p>" },
    });

    const article = screen.getByRole("article");
    expect(article.classList.contains("landscape")).toBe(true);
    expect(article.textContent).toBe("Details");
    const image = screen.getByRole("img", { name: "Grand Arena" });
    expect(image.compareDocumentPosition(screen.getByText("Details")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("CardHeading", () => {
  test("shows the name as the page heading and the subtitle below it", () => {
    render(CardHeading, { props: { name: "Ahri", subtitle: "Inquisitive" } });

    expect(screen.getByRole("heading", { level: 1, name: "Ahri" })).toBeTruthy();
    expect(screen.getByText("Inquisitive")).toBeTruthy();
  });

  test("leaves out a missing subtitle", () => {
    const { container } = render(CardHeading, { props: { name: "Abandoned Hall", subtitle: null } });

    expect(container.querySelector("p")).toBeNull();
  });
});

describe("CardDetailSkeleton", () => {
  test("announces that the card is loading and keeps its shapes decorative", () => {
    const { container } = render(CardDetailSkeleton);

    const article = screen.getByRole("article", { name: "Loading card" });
    expect(article.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
    expect(article.textContent?.trim()).toBe("");
  });
});
