<script setup lang="ts">
defineProps<{ view: "cards" | "printings" }>();
const emit = defineEmits<{ change: [view: "cards" | "printings"] }>();
</script>

<template>
  <fieldset class="view-control" :class="{ printings: view === 'printings' }">
    <legend class="sr-only">Result view</legend>
    <span class="active" aria-hidden="true" />
    <button type="button" :aria-pressed="view === 'cards'" @click="emit('change', 'cards')">Cards</button>
    <button type="button" :aria-pressed="view === 'printings'" @click="emit('change', 'printings')">Printings</button>
  </fieldset>
</template>

<style scoped>
.view-control {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  min-width: 0;
  margin: 0;
  padding: var(--rk-space-1);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-surface-muted);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
}

.active {
  position: absolute;
  inset: var(--rk-space-1) auto var(--rk-space-1) var(--rk-space-1);
  width: calc((100% - 2 * var(--rk-space-1)) / 2);
  border-radius: var(--rk-radius-sm);
  background: var(--rk-color-surface);
  box-shadow: 0 0 0 var(--rk-border-width) var(--rk-color-border);
  transition: transform var(--rk-duration-fast) ease;
  pointer-events: none;
}

.printings .active { transform: translateX(100%); }

button {
  position: relative;
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-3);
  border: 0;
  border-radius: var(--rk-radius-sm);
  background: transparent;
  color: var(--rk-color-text-muted);
  font: inherit;
  cursor: pointer;
}

button[aria-pressed="true"] { color: var(--rk-color-text); }

button:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .active { transition: none; }
}
</style>
