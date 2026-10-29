<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from "vue";
import type { CardOrientation } from "./card-summary.ts";

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
  margin: 0;
  height: 100%;
}

.frame {
  overflow: hidden;
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-placeholder);
  box-shadow: var(--rk-shadow-card);
}

.frame.pending {
  background: linear-gradient(
      100deg,
      var(--rk-color-placeholder) 30%,
      var(--rk-color-placeholder-highlight) 50%,
      var(--rk-color-placeholder) 70%
    )
    0 0 / 200% 100%;
  animation: shimmer var(--rk-duration-shimmer) linear infinite;
}

@keyframes shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
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
  opacity: 0;
  transition: opacity var(--rk-duration-fast) ease-out;
}

.image.loaded {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .image {
    transition: none;
  }

  .frame.pending {
    animation: none;
  }
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
