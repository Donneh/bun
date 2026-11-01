<script setup lang="ts">
import { computed, useId } from "vue";
import CollectionStorageNote from "./CollectionStorageNote.vue";
import { type CollectionStorage, copies } from "./collection.ts";

const props = withDefaults(
  defineProps<{
    code: string;
    copiesOfCard: number;
    ownedPrintings: number;
    printingCount: number;
    storage: CollectionStorage;
    backupKey?: string | null;
    max?: number;
  }>(),
  { backupKey: null, max: 999 },
);

const owned = defineModel<number>("owned", { required: true });
const wishlisted = defineModel<boolean>("wishlisted", { required: true });

const headingId = useId();

const summary = computed(() => {
  if (props.copiesOfCard === 0) return "Not in your collection";
  if (props.printingCount === 1) return `${copies(props.copiesOfCard)} in your collection`;
  return `${copies(props.copiesOfCard)} in ${props.ownedPrintings} of ${props.printingCount} printings`;
});
</script>

<template>
  <section class="collection" :aria-labelledby="headingId">
    <div class="top">
      <h2 :id="headingId" class="heading">Collection</h2>
      <p class="summary" role="status">{{ summary }}</p>
    </div>
    <div class="controls">
      <fieldset class="stepper" :aria-label="`Copies of ${code}`">
        <button
          class="step"
          type="button"
          :aria-label="`Remove a copy of ${code}`"
          :disabled="owned <= 0"
          @click="owned = owned - 1"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
        </button>
        <output class="count">{{ owned }}</output>
        <button
          class="step"
          type="button"
          :aria-label="`Add a copy of ${code}`"
          :disabled="owned >= max"
          @click="owned = owned + 1"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10" /></svg>
        </button>
      </fieldset>
      <span class="code">{{ code }}</span>
      <button
        class="wishlist"
        type="button"
        :aria-pressed="wishlisted"
        :aria-label="`Wishlist ${code}`"
        @click="wishlisted = !wishlisted"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z"
          />
        </svg>
        <span>Wishlist</span>
      </button>
    </div>
    <CollectionStorageNote :state="storage" :backup-key="backupKey" />
  </section>
</template>

<style scoped>
.collection {
  display: grid;
  gap: var(--rk-space-3);
}

.top {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-1) var(--rk-space-3);
  align-items: baseline;
  justify-content: space-between;
}

.heading {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.summary {
  margin: 0;
  font-size: var(--rk-font-size-sm);
  font-weight: var(--rk-font-weight-medium);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-3);
  align-items: center;
}

.stepper {
  min-width: 0;
  margin: 0;
  padding: 0;
  display: inline-flex;
  align-items: center;
  border: var(--rk-border-width) solid var(--rk-glass-edge);
  border-radius: 999px;
  background: color-mix(in srgb, var(--rk-color-text) 4%, transparent);
}

.step,
.wishlist {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--rk-control-height-sm);
  border: none;
  background: transparent;
  color: var(--rk-color-text);
  font: inherit;
  cursor: pointer;
  transition:
    background-color var(--rk-duration-fast) ease,
    color var(--rk-duration-fast) ease;
}

.step {
  width: var(--rk-control-height-sm);
  border-radius: 999px;
}

.step svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.75;
}

.step:disabled {
  color: var(--rk-color-text-muted);
  cursor: default;
  opacity: 0.5;
}

.count {
  min-width: 2ch;
  font: var(--rk-font-weight-bold) var(--rk-font-size-body) var(--rk-font-family-mono);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.code {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.wishlist {
  gap: var(--rk-space-2);
  margin-left: auto;
  padding: 0 var(--rk-space-4);
  border: var(--rk-border-width) solid var(--rk-glass-edge);
  border-radius: 999px;
  font-size: var(--rk-font-size-sm);
  font-weight: var(--rk-font-weight-medium);
}

.wishlist svg {
  width: 1.05rem;
  height: 1.05rem;
  fill: none;
  stroke: currentColor;
  stroke-linejoin: round;
  stroke-width: 1.75;
}

.wishlist[aria-pressed="true"] {
  border-color: var(--rk-color-domain-strong);
  background: color-mix(in srgb, var(--rk-color-domain) 14%, transparent);
}

.wishlist[aria-pressed="true"] svg {
  fill: var(--rk-color-domain-strong);
  stroke: var(--rk-color-domain-strong);
}

@media (hover: hover) {
  .step:not(:disabled):hover,
  .wishlist:hover {
    background: color-mix(in srgb, var(--rk-color-text) 8%, transparent);
  }
}

.step:focus-visible,
.wishlist:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
}
</style>
