import { render } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardTileSkeleton from "./CardTileSkeleton.vue";

describe("CardTileSkeleton", () => {
  test("is a decorative placeholder with a dither in the card frame", () => {
    const { container } = render(CardTileSkeleton);

    const skeleton = container.firstElementChild;
    expect(skeleton?.getAttribute("aria-hidden")).toBe("true");
    expect(skeleton?.classList.contains("portrait")).toBe(true);
    expect(skeleton?.querySelector(".frame canvas")).toBeTruthy();
  });

  test("takes the shape of a landscape card", () => {
    const { container } = render(CardTileSkeleton, { props: { orientation: "landscape" } });

    expect(container.firstElementChild?.classList.contains("landscape")).toBe(true);
  });
});
