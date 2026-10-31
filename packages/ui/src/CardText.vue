<script setup lang="ts">
import { computed } from "vue";
import { parseCardText } from "./card-text.ts";
import RiftboundGlyph from "./RiftboundGlyph.vue";

const props = defineProps<{ text: string }>();

const parts = computed(() => parseCardText(props.text));
</script>

<template>
  <p class="text">
    <template v-for="(part, index) in parts" :key="index">
      <strong v-if="part.kind === 'keyword'" class="keyword">{{ part.text }}</strong>
      <RiftboundGlyph v-else-if="part.kind === 'glyph'" :name="part.name" />
      <template v-else>{{ part.text }}</template>
    </template>
  </p>
</template>

<style scoped>
.text {
  margin: 0;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.keyword {
  font-weight: var(--rk-font-weight-bold);
}
</style>
