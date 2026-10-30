<script setup lang="ts">
import { computed } from "vue";
import { parseCardText } from "./card-text.ts";

const props = defineProps<{ text: string }>();

const parts = computed(() => parseCardText(props.text));
</script>

<template>
  <p class="text">
    <template v-for="(part, index) in parts" :key="index">
      <strong v-if="part.kind === 'keyword'" class="keyword">{{ part.text }}</strong>
      <span
        v-else-if="part.kind === 'symbol'"
        class="symbol"
        :class="{ round: part.round }"
        role="img"
        :aria-label="part.label"
        :title="part.label"
        >{{ part.text }}</span
      >
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

.symbol {
  display: inline-block;
  padding: 0 var(--rk-space-1);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-sm);
  background: var(--rk-color-surface-muted);
  font-family: var(--rk-font-family-mono);
  font-size: var(--rk-font-size-xs);
  line-height: 1.4;
  white-space: nowrap;
  vertical-align: 0.05em;
}

.round {
  min-width: 1.4em;
  padding: 0;
  border-radius: var(--rk-radius-round);
  text-align: center;
}
</style>
