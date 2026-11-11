<script setup lang="ts">
import { computed } from "vue";
import { SPARKLINE_HEIGHT, SPARKLINE_WIDTH, sparklinePath } from "./sparkline.ts";

const props = defineProps<{ values: readonly (number | null)[]; label: string }>();

const path = computed(() => sparklinePath(props.values));
</script>

<template>
  <svg
    class="sparkline"
    role="img"
    :viewBox="`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`"
    preserveAspectRatio="none"
  >
    <title>{{ label }}</title>
    <path class="line" :d="path" />
  </svg>
</template>

<style scoped>
.sparkline {
  display: block;
  width: 7.5rem;
  height: 2rem;
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
</style>
