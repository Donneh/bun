<script setup lang="ts">
import { computed, useId } from "vue";
import { type GlyphName, glyphLabel, glyphMarkup, isDiscGlyph } from "./glyph.ts";

const props = defineProps<{ name: GlyphName; label?: string | undefined; decorative?: boolean | undefined }>();

const idPrefix = useId();
const markup = computed(() => glyphMarkup(props.name, idPrefix));
const accessibleName = computed(() => (props.decorative ? undefined : (props.label ?? glyphLabel(props.name))));
</script>

<template>
  <span
    class="glyph"
    :class="{ disc: isDiscGlyph(name) }"
    :role="accessibleName && 'img'"
    :aria-label="accessibleName"
    :title="accessibleName"
    :aria-hidden="decorative || undefined"
  >
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" v-html="markup" />
  </span>
</template>

<style scoped>
.glyph {
  display: inline-block;
  inline-size: 1.15em;
  block-size: 1.15em;
  margin-inline: 0.05em;
  vertical-align: -0.2em;
  line-height: 0;
}

.disc {
  border-radius: var(--rk-radius-round);
  box-shadow: 0 0 0 var(--rk-border-width) var(--rk-color-glyph-ring);
}

svg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}
</style>
