<script setup lang="ts">
import type { FilterChipSummary } from "./filter-chip.ts";
import RiftboundGlyph from "./RiftboundGlyph.vue";

withDefaults(
  defineProps<{ chips: readonly FilterChipSummary[]; moreConditions?: boolean; label?: string; placeholder?: boolean }>(),
  {
    moreConditions: false,
    label: "Filters",
    placeholder: false,
  },
);

const emit = defineEmits<{ remove: [id: string] }>();
</script>

<template>
  <div v-if="chips.length > 0" class="filters">
    <ul class="chips" :aria-label="label">
      <li v-for="chip in chips" :key="chip.id" class="chip" :class="{ removable: chip.removable }">
        <span class="label">{{ chip.label }}</span>
        <span class="value"
          ><RiftboundGlyph v-for="glyph in chip.glyphs" :key="glyph" class="glyph" :name="glyph" decorative />{{
            chip.value
          }}</span
        >
        <button
          v-if="chip.removable"
          class="remove"
          type="button"
          :aria-label="`Remove ${chip.label} ${chip.value}`"
          @click="emit('remove', chip.id)"
        >
          <span aria-hidden="true">×</span>
        </button>
      </li>
    </ul>
    <p v-if="moreConditions" class="more">Plus other conditions in the query</p>
  </div>
  <div v-else-if="placeholder" class="filters" aria-hidden="true">
    <span class="chip skeleton" />
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--rk-space-2) var(--rk-space-3);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--rk-space-2);
  min-height: calc(var(--rk-control-height-sm) + 2 * var(--rk-border-width));
  max-width: 100%;
  padding: 0 var(--rk-space-3);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-surface);
}

.chip.skeleton {
  width: 8rem;
  background: var(--rk-color-surface-muted);
}

.chip.removable {
  padding-inline-end: 0;
}

.label {
  color: var(--rk-color-text-muted);
}

.value {
  overflow-wrap: anywhere;
  color: var(--rk-color-text);
}

.glyph:last-of-type {
  margin-inline-end: 0.3em;
}

.remove {
  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  align-self: stretch;
  min-width: var(--rk-space-8);
  padding: 0;
  border: none;
  border-left: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: 0 var(--rk-radius-md) var(--rk-radius-md) 0;
  background: transparent;
  color: var(--rk-color-text-muted);
  font: inherit;
  font-size: var(--rk-font-size-md);
  cursor: pointer;
  transition:
    background-color var(--rk-duration-fast) ease,
    color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .remove:hover {
    background: var(--rk-color-accent);
    color: var(--rk-color-on-accent);
  }
}

.remove:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}

.more {
  margin: 0;
  color: var(--rk-color-text-muted);
}
</style>
