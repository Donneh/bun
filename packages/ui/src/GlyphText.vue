<script setup lang="ts">
import type { GlyphTextPart } from "./glyph.ts";
import RiftboundGlyph from "./RiftboundGlyph.vue";

defineProps<{ parts: readonly GlyphTextPart[] }>();
</script>

<template>
  <span class="glyph-text">
    <template v-for="(part, index) in parts" :key="index">
      <RiftboundGlyph
        v-if="part.kind === 'glyph'"
        :class="{ leading: part.decorative }"
        :name="part.name"
        :label="part.label"
        :decorative="part.decorative"
      />
      <template v-else>{{ part.text }}</template>
    </template>
  </span>
</template>

<style scoped>
.leading {
  margin-inline-end: 0.3em;
}
</style>
