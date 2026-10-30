<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import { type DitherColor, type DitherPattern, paintDither, parseRgb, STILL_FRAME_SECONDS } from "./dither.ts";

const props = withDefaults(
  defineProps<{ pattern: DitherPattern; intensity?: number; color?: DitherColor; scale?: number }>(),
  { intensity: 0.5, color: "accent", scale: 3 },
);

const FRAME_INTERVAL_MS = 50;

const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
let frameRequest = 0;
let lastFrameAt = Number.NEGATIVE_INFINITY;
let stopWatchingTheme: (() => void) | undefined;

function isOnScreen(rect: DOMRect) {
  return rect.bottom >= 0 && rect.top <= window.innerHeight;
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

function watchTheme() {
  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(drawStillFrame);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  scheme.addEventListener("change", drawStillFrame);
  window.addEventListener("resize", drawStillFrame);
  return () => {
    observer.disconnect();
    scheme.removeEventListener("change", drawStillFrame);
    window.removeEventListener("resize", drawStillFrame);
  };
}

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    drawStillFrame();
    stopWatchingTheme = watchTheme();
    return;
  }
  document.addEventListener("visibilitychange", onVisibilityChange);
  schedule();
});

onBeforeUnmount(() => {
  pause();
  stopWatchingTheme?.();
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
</style>
