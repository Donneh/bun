<script setup lang="ts">
import type { CardOrientation } from "./card-summary.ts";

withDefaults(defineProps<{ orientation?: CardOrientation; busy?: boolean }>(), {
  orientation: "portrait",
  busy: false,
});
</script>

<template>
  <article class="detail" :class="orientation" :aria-busy="busy">
    <div class="art">
      <slot name="art" />
    </div>
    <div class="body">
      <slot />
    </div>
  </article>
</template>

<style scoped>
.detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--rk-space-8);
  align-items: start;
}

.detail.landscape {
  gap: var(--rk-space-6);
}

.art {
  justify-self: center;
  width: min(18rem, 80vw);
  filter: drop-shadow(0 24px 48px color-mix(in srgb, var(--rk-color-domain) 30%, transparent));
}

.landscape .art {
  width: 100%;
}

.body {
  min-width: 0;
}

@media (min-width: 48rem) {
  .portrait {
    grid-template-columns: minmax(0, 22rem) minmax(0, 1fr);
  }

  .portrait .art {
    width: 100%;
  }
}

@media (min-width: 64rem) {
  .landscape {
    grid-template-columns: minmax(0, 34rem) minmax(0, 1fr);
    gap: var(--rk-space-8);
  }
}
</style>
