<script setup lang="ts">
defineProps<{ loading: boolean }>();
const emit = defineEmits<{ load: [] }>();
</script>

<template>
  <div class="load-more">
    <button class="button" type="button" :disabled="loading" :aria-busy="loading" @click="emit('load')">
      {{ loading ? "Loading…" : "Load more" }}
    </button>
  </div>
</template>

<style scoped>
.load-more {
  display: flex;
  justify-content: center;
  padding-block: var(--rk-space-2);
}

.button {
  width: 100%;
  min-height: var(--rk-control-height);
  padding: 0 var(--rk-space-6);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family-mono);
  cursor: pointer;
  transition:
    border-color var(--rk-duration-fast) ease,
    color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .button:hover:not(:disabled) {
    border-color: var(--rk-color-accent);
    color: var(--rk-color-accent-text);
  }
}

.button:focus-visible {
  border-color: var(--rk-color-accent);
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}

.button:disabled {
  color: var(--rk-color-text-muted);
  cursor: progress;
}

@media (min-width: 40rem) {
  .button {
    width: auto;
  }
}
</style>
