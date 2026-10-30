<script setup lang="ts">
import type { CardOrientation } from "./card-summary.ts";
import Dither from "./Dither.vue";

withDefaults(defineProps<{ orientation?: CardOrientation }>(), { orientation: "portrait" });
</script>

<template>
  <div class="skeleton" :class="orientation" aria-hidden="true">
    <div class="frame">
      <Dither pattern="sweep" color="ink" :intensity="1" />
    </div>
    <div class="caption">
      <span class="line name" />
      <span class="line subtitle" />
    </div>
  </div>
</template>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-2);
  height: 100%;
  padding: var(--rk-space-2);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-surface);
}

.frame {
  position: relative;
  overflow: hidden;
  border-radius: var(--rk-radius-sm);
  background: var(--rk-color-surface-muted);
}

.portrait .frame {
  aspect-ratio: 63 / 88;
}

.landscape .frame {
  aspect-ratio: 88 / 63;
}

.caption {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-2);
  padding: var(--rk-space-1);
}

.line {
  display: block;
  height: var(--rk-space-3);
  border-radius: var(--rk-radius-sm);
  background: var(--rk-color-surface-muted);
}

.name {
  width: 70%;
}

.subtitle {
  width: 45%;
}
</style>
