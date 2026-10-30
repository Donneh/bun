<script setup lang="ts">
import CardTile from "./CardTile.vue";
import CardTileSkeleton from "./CardTileSkeleton.vue";
import type { CardSummary } from "./card-summary.ts";

withDefaults(defineProps<{ cards: readonly CardSummary[]; label?: string; placeholders?: number; stale?: boolean }>(), {
  label: "Cards",
  placeholders: 0,
  stale: false,
});
</script>

<template>
  <div class="container">
    <ul class="grid" :class="{ stale }" :aria-label="label" :aria-busy="stale">
      <li v-for="card in cards" :key="card.id" class="cell" :class="card.orientation">
        <CardTile v-bind="card" />
      </li>
      <li v-for="index in placeholders" :key="`placeholder-${index}`" class="cell" aria-hidden="true">
        <CardTileSkeleton />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.container {
  container-type: inline-size;
}

.grid {
  --column-gap: var(--rk-space-3);
  --row-gap: var(--rk-space-3);

  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(var(--rk-card-min-width), calc((100% - var(--column-gap)) / 2)), 1fr)
  );
  grid-auto-flow: row dense;
  gap: var(--row-gap) var(--column-gap);
  margin: 0;
  padding: 0;
  list-style: none;
  transition: opacity var(--rk-duration-fast) ease;
}

.grid.stale {
  opacity: 0.45;
}

@media (prefers-reduced-motion: reduce) {
  .grid {
    transition: none;
  }
}

.cell {
  min-width: 0;
}

.cell.landscape {
  --rk-card-frame-height: calc((100cqi - var(--column-gap)) / 2 * 88 / 63);

  container-type: inline-size;
  grid-column: span 2;
}

@container (max-width: 40rem) {
  .cell.landscape {
    grid-column: 1 / -1;
  }
}

@container (min-width: 40rem) {
  .grid {
    --column-gap: var(--rk-space-4);
    --row-gap: var(--rk-space-5);
  }
}
</style>
