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
  gap: var(--rk-space-6);
  align-items: start;
}

.art {
  width: 100%;
}

.portrait .art {
  max-width: 22rem;
}

.body {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-6);
  min-width: 0;
}

@media (min-width: 48rem) {
  .detail {
    gap: var(--rk-space-8);
  }

  .portrait {
    grid-template-columns: minmax(0, 22rem) minmax(0, 1fr);
  }

  .landscape {
    grid-template-columns: minmax(0, 30rem) minmax(0, 1fr);
  }

  .art {
    position: sticky;
    top: var(--rk-space-6);
  }
}
</style>
