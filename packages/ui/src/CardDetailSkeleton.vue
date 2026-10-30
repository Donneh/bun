<script setup lang="ts">
import CardDetail from "./CardDetail.vue";
import type { CardOrientation } from "./card-summary.ts";
import Dither from "./Dither.vue";

withDefaults(defineProps<{ orientation?: CardOrientation; label?: string }>(), {
  orientation: "portrait",
  label: "Loading card",
});
</script>

<template>
  <CardDetail :orientation="orientation" busy :aria-label="label">
    <template #art>
      <div class="frame" :class="orientation">
        <Dither pattern="sweep" color="ink" :intensity="1" />
      </div>
    </template>
    <div class="lines heading" aria-hidden="true">
      <span class="line name" />
      <span class="line subtitle" />
    </div>
    <div class="facts" aria-hidden="true">
      <div v-for="index in 4" :key="index" class="lines">
        <span class="line label" />
        <span class="line value" />
      </div>
    </div>
    <div class="lines" aria-hidden="true">
      <span class="line label" />
      <span class="line text" />
      <span class="line text" />
      <span class="line short" />
    </div>
  </CardDetail>
</template>

<style scoped>
.frame {
  position: relative;
  overflow: hidden;
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-surface-muted);
}

.frame.portrait {
  aspect-ratio: 63 / 88;
}

.frame.landscape {
  aspect-ratio: 88 / 63;
}

.lines {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-2);
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 9rem), 1fr));
  gap: var(--rk-space-4) var(--rk-space-5);
}

.line {
  display: block;
  height: var(--rk-space-3);
  border-radius: var(--rk-radius-sm);
  background: var(--rk-color-surface-muted);
}

.heading .name {
  width: 60%;
  height: var(--rk-font-size-display);
}

.heading .subtitle {
  width: 35%;
  height: var(--rk-font-size-lg);
}

.label {
  width: 4rem;
}

.value {
  width: 6rem;
}

.text {
  width: 100%;
}

.short {
  width: 55%;
}
</style>
