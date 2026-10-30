<script setup lang="ts">
import Dither from "./Dither.vue";

defineProps<{ eyebrow: string; title: string; subtitle?: string }>();
</script>

<template>
  <section class="hero">
    <div class="corner">
      <Dither pattern="corner" :intensity="0.5" />
    </div>
    <p class="eyebrow">{{ eyebrow }}</p>
    <h1 class="visually-hidden">{{ title }}</h1>
    <p v-if="subtitle" class="visually-hidden">{{ subtitle }}</p>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  padding-top: var(--rk-space-10);
}

.corner {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: calc(3 * var(--rk-space-10));
  pointer-events: none;
}

.eyebrow {
  position: relative;
  margin: 0;
  color: var(--rk-color-accent-text);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (min-width: 48rem) {
  .corner {
    width: 70%;
    height: 300%;
  }
}
</style>
