<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{ shown?: number; total?: number; searching?: boolean; view?: "cards" | "printings" }>(), {
  shown: 0,
  searching: false,
  view: "cards",
});

const count = (value: number) => value.toLocaleString("en");

const text = computed(() => {
  if (props.searching || props.total === undefined) return "Searching…";
  const singular = props.view === "printings" ? "printing" : "card";
  const noun = props.total === 1 ? singular : `${singular}s`;
  return props.shown < props.total
    ? `Showing ${count(props.shown)} of ${count(props.total)} ${noun}`
    : `${count(props.total)} ${noun}`;
});
</script>

<template>
  <p class="summary" role="status" aria-live="polite" aria-atomic="true">{{ text }}</p>
</template>

<style scoped>
.summary {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
}
</style>
