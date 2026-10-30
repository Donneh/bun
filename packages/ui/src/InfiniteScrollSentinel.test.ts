import { render } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import InfiniteScrollSentinel from "./InfiniteScrollSentinel.vue";

interface FakeObserver {
  readonly callback: IntersectionObserverCallback;
  readonly options: IntersectionObserverInit | undefined;
  readonly targets: Element[];
  disconnected: boolean;
}

let observers: FakeObserver[];

function intersect(isIntersecting: boolean) {
  for (const observer of observers) {
    const entries = observer.targets.map((target) => ({ target, isIntersecting }) as IntersectionObserverEntry);
    observer.callback(entries, observer as unknown as IntersectionObserver);
  }
}

beforeEach(() => {
  observers = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      readonly state: FakeObserver;
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.state = { callback, options, targets: [], disconnected: false };
        observers.push(this.state);
      }
      observe(target: Element) {
        this.state.targets.push(target);
      }
      disconnect() {
        this.state.disconnected = true;
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("InfiniteScrollSentinel", () => {
  test("reports when it comes near the viewport and when it leaves", () => {
    const { emitted } = render(InfiniteScrollSentinel);

    intersect(true);
    intersect(false);

    expect(emitted("change")).toEqual([[true], [false]]);
  });

  test("starts watching ahead of the viewport by the given margin", () => {
    render(InfiniteScrollSentinel, { props: { margin: "0px 0px 400px 0px" } });

    expect(observers[0]?.options?.rootMargin).toBe("0px 0px 400px 0px");
  });

  test("stops watching and reports itself gone when unmounted", () => {
    const changes: boolean[] = [];
    const { unmount } = render(InfiniteScrollSentinel, {
      props: { onChange: (visible: boolean) => changes.push(visible) },
    });
    intersect(true);

    unmount();

    expect(observers[0]?.disconnected).toBe(true);
    expect(changes).toEqual([true, false]);
  });

  test("is hidden from assistive technology", () => {
    const { container } = render(InfiniteScrollSentinel);

    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });
});
