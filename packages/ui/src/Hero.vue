<script setup lang="ts">
import Dither from "./Dither.vue";

defineProps<{ eyebrow: string; title: string; subtitle?: string }>();
</script>

<template>
  <section class="hero">
    <div class="corner">
      <Dither pattern="corner" :intensity="0.5" />
    </div>
    <div class="text">
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1 class="title">{{ title }}</h1>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
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

.text {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-2);
}

.eyebrow {
  margin: 0;
  color: var(--rk-color-accent-text);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
}

.title {
  max-width: 12em;
  margin: 0;
  font-size: var(--rk-font-size-display);
  font-weight: var(--rk-font-weight-bold);
  letter-spacing: var(--rk-letter-spacing-display);
  line-height: var(--rk-line-height-tight);
}

.subtitle {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-body);
}

@media (min-width: 48rem) {
  .corner {
    width: 70%;
    height: 300%;
  }

  .text {
    max-width: 60%;
  }
}
</style>
