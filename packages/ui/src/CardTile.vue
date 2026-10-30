<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from "vue";
import type { CardOrientation } from "./card-summary.ts";
import Dither from "./Dither.vue";

defineProps<{
  name: string;
  subtitle: string | null;
  imageUrl: string;
  orientation: CardOrientation;
  srcset?: string;
  sizes?: string;
}>();

const image = useTemplateRef<HTMLImageElement>("image");
const loaded = ref(false);

onMounted(() => {
  if (image.value?.complete && image.value.naturalWidth > 0) loaded.value = true;
});
</script>

<template>
  <figure class="tile" :class="orientation">
    <div class="frame" :class="{ pending: !loaded }">
      <Dither v-if="!loaded" pattern="sweep" color="ink" :intensity="1" />
      <img
        ref="image"
        class="image"
        :class="{ loaded }"
        :src="imageUrl"
        :srcset="srcset"
        :sizes="sizes"
        :alt="name"
        loading="lazy"
        decoding="async"
        @load="loaded = true"
      />
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
  height: 100%;
  margin: 0;
}

.frame {
  position: relative;
  overflow: hidden;
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-surface-muted);
  transition: transform var(--rk-duration-fast) ease-out;
}

@media (hover: hover) {
  .tile:hover .frame {
    transform: translateY(calc(-1 * var(--rk-space-1)));
  }

  .tile:hover .name {
    color: var(--rk-color-accent-text);
  }
}

.portrait .frame {
  aspect-ratio: 63 / 88;
}

.landscape .frame {
  aspect-ratio: 88 / 63;
}

.image {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--rk-duration-fast) ease-out;
}

.image.loaded {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .frame,
  .image {
    transition: none;
  }

  .tile:hover .frame {
    transform: none;
  }
}

.caption {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.name {
  overflow-wrap: anywhere;
  transition: color var(--rk-duration-fast) ease;
  font-size: var(--rk-font-size-md);
  font-weight: var(--rk-font-weight-bold);
}

.subtitle {
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}
</style>
