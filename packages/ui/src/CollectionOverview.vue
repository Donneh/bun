<script setup lang="ts">
import { computed } from "vue";
import CollectionStorageNote from "./CollectionStorageNote.vue";
import { type CollectionStorage, type CollectionTally, type CollectionValue, copies, printings } from "./collection.ts";

const props = withDefaults(
  defineProps<{
    totals: CollectionTally;
    storage: CollectionStorage;
    backupKey?: string | null;
    value?: CollectionValue | null;
    unknown?: number;
    title?: string;
  }>(),
  { backupKey: null, value: null, unknown: 0, title: "Collection" },
);

const summary = computed(() =>
  [
    `${copies(props.totals.copies)} of ${printings(props.totals.printings)}`,
    `${printings(props.totals.wishlist)} on the wishlist`,
  ].join(" · "),
);
</script>

<template>
  <header class="overview">
    <h1 class="title">{{ title }}</h1>
    <p class="summary" role="status">{{ summary }}</p>
    <p v-if="value" class="value">
      Worth about <strong>{{ value.amount }}</strong> <span class="source">{{ value.source }}</span>
    </p>
    <p v-if="unknown > 0" class="note">
      {{ printings(unknown) }} in this collection {{ unknown === 1 ? "is" : "are" }} not in the card list.
    </p>
    <CollectionStorageNote :state="storage" :backup-key="backupKey" />
    <p class="note">Export the collection to keep a backup or to move it to another browser.</p>
  </header>
</template>

<style scoped>
.overview {
  display: grid;
  gap: var(--rk-space-2);
}

.title {
  margin: 0;
  font: var(--rk-font-weight-bold) var(--rk-font-size-display) / var(--rk-line-height-tight) var(--rk-font-family);
  letter-spacing: var(--rk-letter-spacing-display);
}

.summary {
  margin: 0;
  font-size: var(--rk-font-size-body);
  font-weight: var(--rk-font-weight-medium);
}

.value {
  margin: 0;
  font-size: var(--rk-font-size-body);
}

.source,
.note {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-detail);
}

.note {
  margin: 0;
}

</style>
