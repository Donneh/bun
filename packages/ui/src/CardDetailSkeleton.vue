<script setup lang="ts">
import CardDetail from "./CardDetail.vue";
import type { CardOrientation } from "./card-summary.ts";
import Dither from "./Dither.vue";
import GlassPanel from "./GlassPanel.vue";

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
    <GlassPanel class="info" aria-hidden="true">
      <div class="section head">
        <span class="line kicker" />
        <span class="line name" />
        <span class="line subtitle" />
      </div>
      <div class="section stats">
        <span v-for="index in 3" :key="index" class="stat">
          <span class="line value" />
          <span class="line label" />
        </span>
      </div>
      <div class="section rules">
        <span class="line text" />
        <span class="line text" />
        <span class="line short" />
      </div>
      <div class="section">
        <span class="line label" />
        <span v-for="index in 2" :key="index" class="printing">
          <span class="thumbnail" />
          <span class="line text" />
        </span>
      </div>
      <div class="section foot">
        <span class="pill" />
        <span class="line label" />
      </div>
    </GlassPanel>
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

.info {
  display: grid;
}

.section {
  display: grid;
  gap: var(--rk-space-3);
  padding: var(--rk-space-5) var(--rk-space-6);
}

.section + .section {
  border-top: var(--rk-border-width) solid var(--rk-glass-edge);
}

.head {
  gap: var(--rk-space-2);
  padding-top: var(--rk-space-6);
}

.stats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding-block: var(--rk-space-4);
}

.stat {
  display: grid;
  justify-items: center;
  gap: var(--rk-space-2);
}

.rules {
  background: color-mix(in srgb, var(--rk-color-domain) 8%, transparent);
}

.printing {
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr);
  gap: var(--rk-space-3);
  align-items: center;
  padding-block: var(--rk-space-2);
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pill {
  width: 4rem;
  height: var(--rk-control-height-sm);
  border-radius: 999px;
  background: var(--rk-color-surface-muted);
}

.thumbnail {
  aspect-ratio: 63 / 88;
  border-radius: var(--rk-radius-sm);
  background: var(--rk-color-surface-muted);
}

.line {
  display: block;
  height: var(--rk-space-3);
  border-radius: var(--rk-radius-sm);
  background: var(--rk-color-surface-muted);
}

.kicker {
  width: 40%;
}

.name {
  width: 60%;
  height: 2rem;
}

.subtitle {
  width: 35%;
  height: var(--rk-font-size-lg);
}

.value {
  width: 2rem;
  height: 1.75rem;
}

.label {
  width: 4rem;
}

.text {
  width: 100%;
}

.short {
  width: 55%;
}

@media (max-width: 47.99rem) {
  .section {
    padding-inline: var(--rk-space-4);
  }
}
</style>
