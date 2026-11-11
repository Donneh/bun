<script setup lang="ts">
import { computed, ref } from "vue";
import type { PriceDay } from "./card-detail.ts";
import { nearestDay, SPARKLINE_HEIGHT, SPARKLINE_WIDTH, sparklinePath, sparklinePoint } from "./sparkline.ts";

const props = defineProps<{ days: readonly PriceDay[]; label: string }>();

const values = computed(() => props.days.map((day) => day.amount));
const path = computed(() => sparklinePath(values.value));
const lastDay = computed(() => props.days.length - 1);
const selected = ref<number | null>(null);

const marker = computed(() => (selected.value === null ? null : sparklinePoint(values.value, selected.value)));
const left = computed(() => (marker.value ? `${(marker.value.x / SPARKLINE_WIDTH) * 100}%` : "0%"));
const top = computed(() => {
  const y = marker.value?.y ?? null;
  return y === null ? "50%" : `${(y / SPARKLINE_HEIGHT) * 100}%`;
});
const edge = computed(() => {
  const fraction = marker.value ? marker.value.x / SPARKLINE_WIDTH : 0.5;
  return fraction < 0.2 ? "start" : fraction > 0.8 ? "end" : "middle";
});

function describe(index: number): string {
  const day = props.days[index];
  return day ? `${day.date} · ${day.price ?? "No price"}` : "";
}

function select(event: PointerEvent) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  if (box.width === 0) return;
  selected.value = nearestDay((event.clientX - box.left) / box.width, props.days.length);
}

function leave(event: PointerEvent) {
  if (event.pointerType === "mouse") selected.value = null;
}

function selectDay(index: number) {
  selected.value = Math.min(lastDay.value, Math.max(0, index));
}
</script>

<template>
  <div
    class="sparkline"
    role="slider"
    tabindex="0"
    :aria-label="label"
    aria-valuemin="0"
    :aria-valuemax="lastDay"
    :aria-valuenow="selected ?? lastDay"
    :aria-valuetext="describe(selected ?? lastDay)"
    @pointerdown="select"
    @pointermove="select"
    @pointerleave="leave"
    @focus="selected ??= lastDay"
    @blur="selected = null"
    @keydown.left.prevent="selectDay((selected ?? lastDay) - 1)"
    @keydown.right.prevent="selectDay((selected ?? lastDay) + 1)"
    @keydown.home.prevent="selectDay(0)"
    @keydown.end.prevent="selectDay(lastDay)"
    @keydown.esc="selected = null"
  >
    <svg
      class="chart"
      aria-hidden="true"
      :viewBox="`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`"
      preserveAspectRatio="none"
    >
      <path class="line" :d="path" />
    </svg>
    <template v-if="selected !== null && marker">
      <span class="guide" :style="{ left }" />
      <span v-if="marker.y !== null" class="dot" :style="{ left, top }" />
      <span class="tooltip" :class="edge" :style="{ left }" aria-hidden="true">{{ describe(selected) }}</span>
    </template>
  </div>
</template>

<style scoped>
.sparkline {
  position: relative;
  width: 7.5rem;
  height: 2rem;
  border-radius: var(--rk-radius-sm);
  cursor: crosshair;
  touch-action: pan-y;
}

.sparkline:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}

.chart {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.line {
  fill: none;
  stroke: var(--rk-color-domain-strong);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.guide {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--rk-color-border);
  transform: translateX(-50%);
  pointer-events: none;
}

.dot {
  position: absolute;
  width: 0.5rem;
  height: 0.5rem;
  border: 2px solid var(--rk-color-surface);
  border-radius: 50%;
  background: var(--rk-color-domain-strong);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.tooltip {
  position: absolute;
  bottom: calc(100% + var(--rk-space-1));
  z-index: 1;
  padding: var(--rk-space-1) var(--rk-space-2);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-sm);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
}

.tooltip.middle {
  transform: translateX(-50%);
}

.tooltip.end {
  transform: translateX(-100%);
}
</style>
