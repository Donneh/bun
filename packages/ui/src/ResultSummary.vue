<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ shown: number; total: number }>();

const text = computed(() => {
  const noun = props.total === 1 ? "card" : "cards";
  return props.shown < props.total ? `Showing ${props.shown} of ${props.total} ${noun}` : `${props.total} ${noun}`;
});
</script>

<template>
  <p class="summary" aria-live="polite" aria-atomic="true">{{ text }}</p>
</template>

<style scoped>
.summary {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
}
</style>
