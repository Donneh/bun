import { render } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import DomainBackdrop from "./DomainBackdrop.vue";

let frames: number;
let pendingFrames: number;

function preferReducedMotion(reduce: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: reduce && query.includes("reduce"),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

beforeEach(() => {
  frames = 0;
  pendingFrames = 0;
  vi.stubGlobal("requestAnimationFrame", () => ++pendingFrames);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () =>
      ({
        createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
        putImageData: () => frames++,
      }) as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 96, height: 96 }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const backdropOf = (container: Element) => container.firstElementChild as HTMLElement;

describe("DomainBackdrop", () => {
  test("is decorative and hidden from assistive technology", () => {
    preferReducedMotion(true);
    const { container } = render(DomainBackdrop, { props: { domains: ["fury"] } });

    expect(backdropOf(container).getAttribute("aria-hidden")).toBe("true");
  });

  test("tints the dither and the glow with the first domain and the second glow with the second domain", () => {
    preferReducedMotion(true);
    const { container } = render(DomainBackdrop, { props: { domains: ["calm", "chaos"] } });
    const backdrop = backdropOf(container);

    expect(backdrop.dataset.rkDomain).toBe("calm");
    expect(backdrop.style.getPropertyValue("--rk-color-domain")).toBe("var(--rk-color-domain-calm)");
    expect(backdrop.style.getPropertyValue("--rk-color-domain-second")).toBe("var(--rk-color-domain-chaos)");
    expect(container.querySelector("canvas")?.classList.contains("domain")).toBe(true);
    expect(container.querySelector(".glow")).not.toBeNull();
  });

  test("leaves the glow out when asked", () => {
    preferReducedMotion(true);
    const { container } = render(DomainBackdrop, { props: { domains: ["mind"], glow: false } });

    expect(container.querySelector(".glow")).toBeNull();
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  test("draws one still frame and never animates with reduced motion", () => {
    preferReducedMotion(true);
    render(DomainBackdrop, { props: { domains: ["order"] } });

    expect(frames).toBe(1);
    expect(pendingFrames).toBe(0);
  });

  test("animates the dither without reduced motion", () => {
    preferReducedMotion(false);
    render(DomainBackdrop, { props: { domains: ["order"] } });

    expect(pendingFrames).toBe(1);
  });

  test("redraws the still frame in the new color when the domain changes", async () => {
    preferReducedMotion(true);
    const { rerender } = render(DomainBackdrop, { props: { domains: ["body"] } });

    await rerender({ domains: ["fury"] });

    expect(frames).toBe(2);
  });
});
