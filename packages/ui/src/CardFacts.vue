<script setup lang="ts">
import CardText from "./CardText.vue";
import type { CardFact } from "./card-detail.ts";
import GlyphText from "./GlyphText.vue";

defineProps<{ facts: readonly CardFact[] }>();
</script>

<template>
  <dl v-if="facts.length > 0" class="facts">
    <div v-for="fact in facts" :key="fact.label" class="fact" :class="{ wide: 'rulesText' in fact }">
      <dt class="label">{{ fact.label }}</dt>
      <dd class="value">
        <CardText v-if="'rulesText' in fact" :text="fact.rulesText" />
        <GlyphText v-else :parts="fact.value" />
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 9rem), 1fr));
  gap: var(--rk-space-4) var(--rk-space-5);
  margin: 0;
}

.fact {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-1);
  min-width: 0;
}

.wide {
  grid-column: 1 / -1;
}

.label {
  color: var(--rk-color-text-muted);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
}

.value {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
