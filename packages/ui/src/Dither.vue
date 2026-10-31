<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import {
  type DitherBox,
  type DitherColor,
  type DitherPattern,
  paintDither,
  parseRgb,
  STILL_FRAME_SECONDS,
} from "./dither.ts";

const props = withDefaults(
  defineProps<{
    pattern: DitherPattern;
    intensity?: number;
    color?: DitherColor;
    scale?: number;
    avoid?: readonly (Element | null | undefined)[];
    clearance?: number;
  }>(),
  { intensity: 0.5, color: "accent", scale: 3, avoid: () => [], clearance: 48 },
);

const FRAME_INTERVAL_MS = 50;

const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
let frameRequest = 0;
let lastFrameAt = Number.NEGATIVE_INFINITY;
let stopWatching: (() => void) | undefined;

function isOnScreen(rect: DOMRect) {
  return rect.bottom >= 0 && rect.top <= window.innerHeight;
}

function keepOutBoxes(canvasRect: DOMRect): DitherBox[] {
  return props.avoid.flatMap((element) => {
    if (!element) return [];
    const rect = element.getBoundingClientRect();
    return [
      {
        left: (rect.left - canvasRect.left) / props.scale,
        top: (rect.top - canvasRect.top) / props.scale,
        right: (rect.right - canvasRect.left) / props.scale,
        bottom: (rect.bottom - canvasRect.top) / props.scale,
      },
    ];
  });
}

function draw(seconds: number) {
  const element = canvas.value;
  const context = element?.getContext("2d");
  if (!element || !context) return;
  const rect = element.getBoundingClientRect();
  if (!isOnScreen(rect)) return;
  const width = Math.max(1, Math.round(rect.width / props.scale));
  const height = Math.max(1, Math.round(rect.height / props.scale));
  if (element.width !== width || element.height !== height) {
    element.width = width;
    element.height = height;
  }
  const image = context.createImageData(width, height);
  paintDither(image.data, {
    pattern: props.pattern,
    intensity: props.intensity,
    color: parseRgb(getComputedStyle(element).color),
    width,
    height,
    seconds,
    keepOut: keepOutBoxes(rect),
    clearance: props.clearance / props.scale,
  });
  context.putImageData(image, 0, 0);
}

function tick(now: number) {
  frameRequest = 0;
  if (now - lastFrameAt >= FRAME_INTERVAL_MS) {
    lastFrameAt = now;
    draw(now / 1000);
  }
  schedule();
}

function schedule() {
  if (frameRequest === 0 && !document.hidden) frameRequest = requestAnimationFrame(tick);
}

function pause() {
  cancelAnimationFrame(frameRequest);
  frameRequest = 0;
}

function onVisibilityChange() {
  if (document.hidden) pause();
  else schedule();
}

function drawStillFrame() {
  draw(STILL_FRAME_SECONDS);
}

function watchThemeAndLayout() {
  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  const themeObserver = new MutationObserver(drawStillFrame);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  scheme.addEventListener("change", drawStillFrame);
  window.addEventListener("resize", drawStillFrame);
  const layoutObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(drawStillFrame);
  const stopWatchingElements = watch(
    () => [canvas.value, ...props.avoid],
    (elements) => {
      layoutObserver?.disconnect();
      for (const element of elements) if (element) layoutObserver?.observe(element);
      drawStillFrame();
    },
    { immediate: true, flush: "post" },
  );
  return () => {
    stopWatchingElements();
    themeObserver.disconnect();
    layoutObserver?.disconnect();
    scheme.removeEventListener("change", drawStillFrame);
    window.removeEventListener("resize", drawStillFrame);
  };
}

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stopWatching = watchThemeAndLayout();
    return;
  }
  document.addEventListener("visibilitychange", onVisibilityChange);
  schedule();
});

onBeforeUnmount(() => {
  pause();
  stopWatching?.();
  document.removeEventListener("visibilitychange", onVisibilityChange);
});
</script>

<template>
  <canvas ref="canvas" class="dither" :class="color" aria-hidden="true" />
</template>

<style scoped>
.dither {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  pointer-events: none;
}

.accent {
  color: var(--rk-color-accent);
}

.ink {
  color: var(--rk-color-text);
}

.domain {
  color: var(--rk-color-domain);
}
</style>
