<script setup lang="ts">
import type { SortDirection, SortOption, SortSelection } from "./sort-option.ts";

const props = defineProps<{ sort: string; direction: SortDirection; options: readonly SortOption[] }>();
const emit = defineEmits<{ change: [selection: SortSelection] }>();

const DIRECTIONS: readonly { readonly value: SortDirection; readonly label: string }[] = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

function changeSort(event: Event) {
  emit("change", { sort: (event.target as HTMLSelectElement).value, direction: props.direction });
}

function changeDirection(event: Event) {
  emit("change", { sort: props.sort, direction: (event.target as HTMLSelectElement).value as SortDirection });
}
</script>

<template>
  <div class="sort">
    <label class="field">
      <span class="label">Sort by</span>
      <select class="select" name="sort" :value="sort" @change="changeSort">
        <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </label>
    <label class="field">
      <span class="label">Direction</span>
      <select class="select" name="direction" :value="direction" @change="changeDirection">
        <option v-for="option in DIRECTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.sort {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-3);
}

.field {
  display: inline-flex;
  align-items: center;
  gap: var(--rk-space-2);
  font-size: var(--rk-font-size-sm);
}

.label {
  color: var(--rk-color-text-muted);
}

.select {
  font: inherit;
  padding: var(--rk-space-1) var(--rk-space-2);
  border: 1px solid var(--rk-color-border);
  border-radius: var(--rk-radius-sm);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
}

.select:focus-visible {
  outline: 2px solid var(--rk-color-focus);
  outline-offset: 2px;
}
</style>
