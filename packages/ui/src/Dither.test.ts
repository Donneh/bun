import { render } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Dither from "./Dither.vue";

interface FakeContext {
  readonly frames: Uint8ClampedArray[];
}

let context: FakeContext;
let pendingFrames: Map<number, FrameRequestCallback>;
let nextFrameId: number;

function fakeCanvasContext() {
  const frames: Uint8ClampedArray[] = [];
  context = { frames };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () =>
      ({
        createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
        putImageData: (image: { data: Uint8ClampedArray }) => frames.push(image.data),
      }) as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 96, height: 96 }),
  );
}

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

function runFrame(time: number) {
  const callbacks = [...pendingFrames.values()];
  pendingFrames.clear();
  for (const callback of callbacks) callback(time);
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

const SIDE = 32;

const litPixels = (frame: Uint8ClampedArray | undefined) =>
  frame?.filter((value, index) => index % 4 === 3 && value > 0).length ?? 0;

const litPixelsWhere = (frame: Uint8ClampedArray | undefined, where: (x: number, y: number) => boolean) =>
  frame?.filter((value, index) => {
    const pixel = Math.floor(index / 4);
    return index % 4 === 3 && value > 0 && where(pixel % SIDE, Math.floor(pixel / SIDE));
  }).length ?? 0;

beforeEach(() => {
  pendingFrames = new Map();
  nextFrameId = 1;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextFrameId++;
    pendingFrames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => pendingFrames.delete(id));
  fakeCanvasContext();
});

afterEach(() => {
  setHidden(false);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Dither", () => {
  test("is decorative and hidden from assistive technology", () => {
    preferReducedMotion(true);
    const { container } = render(Dither, { props: { pattern: "corner" } });

    expect(container.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
  });

  test("paints in the requested color token", () => {
    preferReducedMotion(true);
    const { container } = render(Dither, { props: { pattern: "sweep", color: "ink" } });

    expect(container.querySelector("canvas")?.classList.contains("ink")).toBe(true);
  });

  test("renders one still frame and never animates with reduced motion", () => {
    preferReducedMotion(true);
    render(Dither, { props: { pattern: "corner", intensity: 1 } });

    expect(context.frames).toHaveLength(1);
    expect(litPixels(context.frames[0])).toBeGreaterThan(0);
    expect(pendingFrames.size).toBe(0);
  });

  test("keeps most of a loading tile empty at every moment of the sweep", () => {
    preferReducedMotion(false);
    render(Dither, { props: { pattern: "sweep", color: "ink", intensity: 1 } });

    for (let second = 0; second < 6; second++) runFrame(second * 1_000);

    const pixels = 96 * 96;
    for (const frame of context.frames) expect(litPixels(frame) / pixels).toBeLessThan(0.3);
  });

  test("animates frame after frame", () => {
    preferReducedMotion(false);
    render(Dither, { props: { pattern: "sweep" } });

    runFrame(1_000);
    runFrame(1_100);

    expect(context.frames).toHaveLength(2);
    expect(context.frames[0]).not.toEqual(context.frames[1]);
    expect(pendingFrames.size).toBe(1);
  });

  test("fades the corner out before its left and bottom edges, so it never ends in a straight line", () => {
    preferReducedMotion(true);
    render(Dither, { props: { pattern: "corner", intensity: 1 } });

    const frame = context.frames[0];
    expect(litPixels(frame)).toBeGreaterThan(0);
    expect(litPixelsWhere(frame, (x) => x === 0)).toBe(0);
    expect(litPixelsWhere(frame, (_x, y) => y === SIDE - 1)).toBe(0);
  });

  test("keeps clear of the elements it must avoid", () => {
    preferReducedMotion(true);
    const button = document.createElement("button");
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect({ x: 60, y: 0, width: 36, height: 30 }));
    render(Dither, { props: { pattern: "corner", intensity: 1, avoid: [button], clearance: 6 } });

    const frame = context.frames.at(-1);
    expect(litPixels(frame)).toBeGreaterThan(0);
    expect(litPixelsWhere(frame, (x, y) => x >= 20 && y < 10)).toBe(0);
  });

  test("paints nothing at zero intensity", () => {
    preferReducedMotion(true);
    render(Dither, { props: { pattern: "corner", intensity: 0 } });

    expect(litPixels(context.frames[0])).toBe(0);
  });

  test("pauses while the tab is hidden and resumes when it is shown", () => {
    preferReducedMotion(false);
    render(Dither, { props: { pattern: "corner" } });

    setHidden(true);
    expect(pendingFrames.size).toBe(0);

    setHidden(false);
    runFrame(1_000);
    expect(context.frames).toHaveLength(1);
  });

  test("stops when unmounted", () => {
    preferReducedMotion(false);
    const { unmount } = render(Dither, { props: { pattern: "corner" } });

    unmount();

    expect(pendingFrames.size).toBe(0);
  });
});
