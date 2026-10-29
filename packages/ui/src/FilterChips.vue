<script setup lang="ts">
import type { FilterChipSummary } from "./filter-chip.ts";

withDefaults(defineProps<{ chips: readonly FilterChipSummary[]; moreConditions?: boolean; label?: string }>(), {
  moreConditions: false,
  label: "Filters",
});

const emit = defineEmits<{ remove: [id: string] }>();
</script>

<template>
  <div v-if="chips.length > 0 || moreConditions" class="filters">
    <ul v-if="chips.length > 0" class="chips" :aria-label="label">
      <li v-for="chip in chips" :key="chip.id" class="chip" :class="{ removable: chip.removable }">
        <span class="label">{{ chip.label }}</span>
        <span class="value">{{ chip.value }}</span>
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
    <p v-if="moreConditions" class="more">The query has more conditions than these filters.</p>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--rk-space-2) var(--rk-space-3);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--rk-space-1);
  padding: var(--rk-space-1) var(--rk-space-3);
  border: 1px solid var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-surface);
  font-size: var(--rk-font-size-sm);
}

.chip.removable {
  padding-inline-end: var(--rk-space-1);
}

.label {
  color: var(--rk-color-text-muted);
}

.value {
  font-weight: var(--rk-font-weight-bold);
}

.remove {
  display: inline-grid;
  place-items: center;
  width: var(--rk-space-6);
  height: var(--rk-space-6);
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--rk-color-text-muted);
  font: inherit;
  cursor: pointer;
  transition:
    background-color var(--rk-duration-fast) ease,
    color var(--rk-duration-fast) ease;
}

.remove:hover {
  background: var(--rk-color-placeholder);
  color: var(--rk-color-text);
}

.remove:focus-visible {
  outline: 2px solid var(--rk-color-focus);
  outline-offset: 1px;
}

.more {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}
</style>
