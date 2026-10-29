<script setup lang="ts">
import type { CardOrientation } from "./card-summary.ts";

defineProps<{ name: string; subtitle: string | null; imageUrl: string; orientation: CardOrientation }>();
</script>

<template>
  <figure class="tile" :class="orientation">
    <div class="frame">
      <img class="image" :src="imageUrl" :alt="name" loading="lazy" decoding="async" />
    </div>
    <figcaption class="caption">
      <span class="name">{{ name }}</span>
      <span v-if="subtitle" class="subtitle">{{ subtitle }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-2);
  margin: 0;
  height: 100%;
}

.frame {
  overflow: hidden;
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-placeholder);
  box-shadow: var(--rk-shadow-card);
}

.portrait .frame {
  aspect-ratio: 63 / 88;
}

.landscape .frame {
  aspect-ratio: 88 / 63;
}

.image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.caption {
  display: flex;
  flex-direction: column;
  padding-inline: var(--rk-space-1);
}

.name {
  font-weight: var(--rk-font-weight-bold);
}

.subtitle {
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}
</style>
