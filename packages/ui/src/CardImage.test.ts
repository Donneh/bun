import { fireEvent, render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardImage from "./CardImage.vue";

const props = { name: "Jinx", imageUrl: "https://example.com/jinx.png", orientation: "portrait" } as const;

describe("CardImage", () => {
  test("loads lazily unless asked to load at once", async () => {
    const { rerender } = render(CardImage, { props });
    expect(screen.getByRole("img", { name: "Jinx" }).getAttribute("loading")).toBe("lazy");

    await rerender({ ...props, loading: "eager" });

    expect(screen.getByRole("img", { name: "Jinx" }).getAttribute("loading")).toBe("eager");
  });

  test("shows the dither again while a new image loads", async () => {
    const { container, rerender } = render(CardImage, { props });
    const image = screen.getByRole("img", { name: "Jinx" });

    await fireEvent.load(image);
    expect(container.querySelector("canvas")).toBeNull();

    await rerender({ ...props, imageUrl: "https://example.com/jinx-alt.png" });

    expect(container.querySelector("canvas")).not.toBeNull();
    expect(image.parentElement?.classList.contains("pending")).toBe(true);
  });

  test("keeps the shape of the card", () => {
    const { container } = render(CardImage, { props: { ...props, orientation: "landscape" } });

    expect(container.firstElementChild?.classList.contains("landscape")).toBe(true);
  });
});
