<script setup lang="ts">
import { useTemplateRef } from "vue";
import Dither from "./Dither.vue";

defineProps<{ eyebrow: string; title: string; subtitle?: string }>();

const eyebrowText = useTemplateRef<HTMLElement>("eyebrowText");
const actions = useTemplateRef<HTMLElement>("actions");
const content = useTemplateRef<HTMLElement>("content");
</script>

<template>
  <section class="hero">
    <div class="corner">
      <Dither pattern="corner" :intensity="0.5" :avoid="[eyebrowText, actions, content]" />
    </div>
    <div class="row">
      <p class="eyebrow"><span ref="eyebrowText">{{ eyebrow }}</span></p>
      <div v-if="$slots.actions" ref="actions" class="actions">
        <slot name="actions" />
      </div>
    </div>
    <div ref="content" class="content" aria-hidden="true" />
    <h1 class="visually-hidden">{{ title }}</h1>
    <p v-if="subtitle" class="visually-hidden">{{ subtitle }}</p>
  </section>
</template>

<style scoped>
.hero {
  --corner-height: 10rem;

  position: relative;
  padding-top: calc(var(--rk-space-10) + var(--rk-space-8));
}

.corner {
  position: absolute;
  top: 0;
  right: calc((100% - 100vw) / 2);
  width: 100vw;
  height: var(--corner-height);
  pointer-events: none;
}

.row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--rk-space-4);
}

.eyebrow {
  min-width: 0;
  margin: 0;
  color: var(--rk-color-accent-text);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
}

.actions {
  display: flex;
  flex-shrink: 0;
}

.content {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  height: var(--corner-height);
  pointer-events: none;
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
  .hero {
    --corner-height: 15rem;

    padding-top: calc(2 * var(--rk-space-10));
  }
}
</style>
