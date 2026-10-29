<script setup lang="ts">
import CardTile from "./CardTile.vue";
import type { CardSummary } from "./card-summary.ts";

withDefaults(defineProps<{ cards: readonly CardSummary[]; label?: string }>(), { label: "Cards" });
</script>

<template>
  <div class="container">
    <ul class="grid" :aria-label="label">
      <li v-for="card in cards" :key="card.id" class="cell" :class="card.orientation">
        <CardTile v-bind="card" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.container {
  container-type: inline-size;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--rk-card-min-width), 1fr));
  grid-auto-flow: row dense;
  gap: var(--rk-space-6) var(--rk-space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.cell.landscape {
  grid-column: span 2;
}

@container (max-width: 23rem) {
  .cell.landscape {
    grid-column: auto;
  }
}
</style>
