<script setup lang="ts">
import { computed } from "vue";
import type { SortDirection, SortOption, SortSelection } from "./sort-option.ts";

const props = defineProps<{ sort: string; direction: SortDirection; options: readonly SortOption[] }>();
const emit = defineEmits<{ change: [selection: SortSelection] }>();

const DIRECTIONS: Record<SortDirection, { readonly label: string; readonly short: string; readonly arrow: string }> = {
  asc: { label: "Ascending", short: "Asc", arrow: "↑" },
  desc: { label: "Descending", short: "Desc", arrow: "↓" },
};

const current = computed(() => DIRECTIONS[props.direction]);
const opposite = computed<SortDirection>(() => (props.direction === "asc" ? "desc" : "asc"));

function changeSort(event: Event) {
  emit("change", { sort: (event.target as HTMLSelectElement).value, direction: props.direction });
}

function toggleDirection() {
  emit("change", { sort: props.sort, direction: opposite.value });
}
</script>

<template>
  <div class="sort">
    <label class="field">
      <span class="label">Sort by</span>
      <span class="select-wrap">
        <select class="control select" name="sort" :value="sort" @change="changeSort">
          <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </span>
    </label>
    <button
      class="control direction"
      type="button"
      :aria-label="`Direction: ${current.label}`"
      :title="`Switch to ${DIRECTIONS[opposite].label.toLowerCase()}`"
      @click="toggleDirection"
    >
      <span aria-hidden="true">{{ current.arrow }} {{ current.short }}</span>
    </button>
  </div>
</template>

<style scoped>
.sort {
  display: flex;
  align-items: center;
  gap: var(--rk-space-2);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
}

.field {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--rk-space-2);
  min-width: 0;
}

.label {
  flex-shrink: 0;
  color: var(--rk-color-text);
}

.select-wrap {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
}

.select-wrap::after {
  content: "▾";
  position: absolute;
  top: 50%;
  right: var(--rk-space-3);
  transform: translateY(-50%);
  color: var(--rk-color-text);
  pointer-events: none;
}

.control {
  min-height: var(--rk-control-height-sm);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: inherit;
  cursor: pointer;
  transition: border-color var(--rk-duration-fast) ease;
}

.select {
  width: 100%;
  padding: 0 calc(var(--rk-space-3) + var(--rk-space-4)) 0 var(--rk-space-3);
  appearance: none;
}

.direction {
  flex-shrink: 0;
  padding: 0 var(--rk-space-3);
  white-space: nowrap;
}

@media (hover: hover) {
  .control:hover {
    border-color: var(--rk-color-accent);
  }
}

.control:focus-visible {
  border-color: var(--rk-color-accent);
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}

@media (min-width: 40rem) {
  .field,
  .select-wrap {
    flex: initial;
  }
}
</style>
