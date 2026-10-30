import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen } from "@testing-library/vue";
import { afterEach, describe, expect, test, vi } from "vitest";
import CardTile from "./CardTile.vue";

const jinx = {
  name: "Jinx",
  subtitle: "Loose Cannon",
  imageUrl: "https://example.com/jinx.png",
  orientation: "portrait",
  href: "/cards/jinx-loose-cannon",
} as const;

describe("CardTile", () => {
  test("shows the card image, name and subtitle", () => {
    render(CardTile, { props: jinx });

    expect(screen.getByRole("img", { name: "Jinx" }).getAttribute("src")).toBe("https://example.com/jinx.png");
    expect(screen.getByText("Jinx")).toBeTruthy();
    expect(screen.getByText("Loose Cannon")).toBeTruthy();
  });

  test("links to the card by its name and subtitle", () => {
    render(CardTile, { props: jinx });

    expect(screen.getByRole("link", { name: "Jinx, Loose Cannon" }).getAttribute("href")).toBe(
      "/cards/jinx-loose-cannon",
    );
  });

  test("reports a plain click instead of following the link", async () => {
    const { emitted } = render(CardTile, { props: jinx });

    await userEvent.click(screen.getByRole("link"));

    expect(emitted("navigate")).toEqual([["/cards/jinx-loose-cannon"]]);
  });

  test("leaves a modified or middle click to the browser", async () => {
    const { emitted } = render(CardTile, { props: jinx });
    const link = screen.getByRole("link");

    await fireEvent.click(link, { ctrlKey: true });
    await fireEvent.click(link, { metaKey: true });
    await fireEvent.click(link, { shiftKey: true });
    await fireEvent.click(link, { button: 1 });

    expect(emitted("navigate")).toBeUndefined();
  });

  test("passes responsive image candidates to the browser", () => {
    render(CardTile, {
      props: {
        ...jinx,
        srcset: "https://example.com/jinx-240.webp 240w, https://example.com/jinx-480.webp 480w",
        sizes: "14rem",
      },
    });

    const image = screen.getByRole("img", { name: "Jinx" });
    expect(image.getAttribute("srcset")).toBe(
      "https://example.com/jinx-240.webp 240w, https://example.com/jinx-480.webp 480w",
    );
    expect(image.getAttribute("sizes")).toBe("14rem");
    expect(image.getAttribute("src")).toBe("https://example.com/jinx.png");
  });

  test("renders a plain image without responsive props", () => {
    render(CardTile, { props: jinx });

    const image = screen.getByRole("img", { name: "Jinx" });
    expect(image.hasAttribute("srcset")).toBe(false);
    expect(image.hasAttribute("sizes")).toBe(false);
  });

  test("leaves out a missing subtitle", () => {
    render(CardTile, { props: { ...jinx, name: "Abandon", subtitle: null } });

    expect(screen.getByRole("figure").querySelector("figcaption")?.textContent?.trim()).toBe("Abandon");
    expect(screen.getByRole("link", { name: "Abandon" })).toBeTruthy();
  });

  test("shows a loading skeleton until the image has loaded", async () => {
    render(CardTile, { props: jinx });
    const image = screen.getByRole("img", { name: "Jinx" });
    const frame = image.parentElement;

    expect(frame?.classList.contains("pending")).toBe(true);
    expect(image.classList.contains("loaded")).toBe(false);

    await fireEvent.load(image);

    expect(frame?.classList.contains("pending")).toBe(false);
    expect(image.classList.contains("loaded")).toBe(true);
  });

  describe("intent to open", () => {
    afterEach(() => vi.useRealTimers());

    test("is reported once the pointer rests on the card", async () => {
      vi.useFakeTimers();
      const { emitted } = render(CardTile, { props: jinx });
      const link = screen.getByRole("link", { name: "Jinx, Loose Cannon" });

      await fireEvent.pointerEnter(link);
      expect(emitted("intent")).toBeUndefined();
      vi.advanceTimersByTime(100);

      expect(emitted("intent")).toHaveLength(1);
    });

    test("is not reported when the pointer only passes over the card", async () => {
      vi.useFakeTimers();
      const { emitted } = render(CardTile, { props: jinx });
      const link = screen.getByRole("link", { name: "Jinx, Loose Cannon" });

      await fireEvent.pointerEnter(link);
      await fireEvent.pointerLeave(link);
      vi.advanceTimersByTime(100);

      expect(emitted("intent")).toBeUndefined();
    });

    test("is reported at once on keyboard focus and on touch", async () => {
      const { emitted } = render(CardTile, { props: jinx });
      const link = screen.getByRole("link", { name: "Jinx, Loose Cannon" });

      await fireEvent.focus(link);
      await fireEvent.touchStart(link);

      expect(emitted("intent")).toHaveLength(2);
    });
  });
});
