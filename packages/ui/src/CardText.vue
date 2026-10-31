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
      <strong
        v-if="part.kind === 'keyword'"
        class="keyword"
        :class="[part.tone, { arrow: part.arrow, joined: part.joined, 'with-cost': part.cost.length > 0 }]"
        >{{ part.text }}<RiftboundGlyph v-for="(glyph, glyphIndex) in part.cost" :key="glyphIndex" :name="glyph"
      /></strong>
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
  --slant: 0.4em;
  --point: 0.55em;
  --top-left: var(--slant) 0;
  --top-right: 100% 0;
  --end: calc(100% - var(--slant) / 2) 50%;
  --bottom-right: calc(100% - var(--slant)) 100%;
  --bottom-left: 0 100%;
  --start: calc(var(--slant) / 2) 50%;

  display: inline-block;
  padding: 0.1em calc(var(--slant) + 0.2em);
  clip-path: polygon(var(--top-left), var(--top-right), var(--end), var(--bottom-right), var(--bottom-left), var(--start));
  font-size: 0.9em;
  font-style: italic;
  font-weight: var(--rk-font-weight-bold);
  line-height: 1.4;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
}

.keyword :deep(.glyph) {
  margin-inline: 0.08em;
  font-size: 1.1em;
  vertical-align: -0.2em;
}

.keyword :deep([data-glyph="rune_rainbow"] :is(path, circle, rect, polygon, ellipse)) {
  fill: currentColor;
}

.keyword :deep(.glyph:first-child) {
  margin-inline-start: 0.4em;
}

.with-cost {
  padding-inline-end: calc(var(--slant) + 0.45em);
}

.arrow.with-cost {
  padding-inline-end: calc(var(--point) + 0.45em);
}

.arrow {
  --top-right: calc(100% - var(--point)) 0;
  --end: 100% 50%;
  --bottom-right: calc(100% - var(--point)) 100%;

  padding-inline-end: calc(var(--point) + 0.2em);
}

.joined {
  --top-left: 0 0;
  --start: var(--point) 50%;
  --bottom-left: 0 100%;

  margin-inline-start: calc(0.15em - var(--point));
  padding-inline-start: calc(var(--point) + 0.25em);
}

.teal {
  background: var(--rk-color-keyword-teal);
  color: var(--rk-color-on-keyword-teal);
}

.lime {
  background: var(--rk-color-keyword-lime);
  color: var(--rk-color-on-keyword-lime);
}

.rose {
  background: var(--rk-color-keyword-rose);
  color: var(--rk-color-on-keyword-rose);
}

.slate {
  background: var(--rk-color-keyword-slate);
  color: var(--rk-color-on-keyword-slate);
}
</style>
