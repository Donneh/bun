<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import type { CardOrientation } from "./card-summary.ts";
import Dither from "./Dither.vue";

const props = withDefaults(
  defineProps<{
    name: string;
    imageUrl: string;
    orientation: CardOrientation;
    srcset?: string | undefined;
    sizes?: string | undefined;
    loading?: "lazy" | "eager";
  }>(),
  { loading: "lazy" },
);

const image = useTemplateRef<HTMLImageElement>("image");
const loaded = ref(false);

function markLoadedIfComplete() {
  if (image.value?.complete && image.value.naturalWidth > 0) loaded.value = true;
}

onMounted(markLoadedIfComplete);

watch(
  () => props.imageUrl,
  async () => {
    loaded.value = false;
    await nextTick();
    markLoadedIfComplete();
  },
);
</script>

<template>
  <div class="frame" :class="[orientation, { pending: !loaded }]">
    <Dither v-if="!loaded" pattern="sweep" color="ink" :intensity="1" />
    <img
      ref="image"
      class="image"
      :class="{ loaded }"
      :src="imageUrl"
      :srcset="srcset"
      :sizes="sizes"
      :alt="name"
      :loading="loading"
      decoding="async"
      @load="loaded = true"
    />
  </div>
</template>

<style scoped>
.frame {
  position: relative;
  overflow: hidden;
  border-radius: var(--rk-radius-lg);
}

.pending {
  background: var(--rk-color-surface-muted);
}

.portrait {
  aspect-ratio: 63 / 88;
}

.landscape {
  height: var(--rk-card-frame-height, auto);
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
  .image {
    transition: none;
  }
}
</style>
