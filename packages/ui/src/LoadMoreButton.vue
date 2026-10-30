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
  padding-block: var(--rk-space-4);
}

.button {
  font: inherit;
  font-weight: var(--rk-font-weight-bold);
  padding: var(--rk-space-2) var(--rk-space-6);
  border: 1px solid var(--rk-color-accent);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  cursor: pointer;
  transition: background-color var(--rk-duration-fast) ease;
}

.button:hover:not(:disabled) {
  background: var(--rk-color-placeholder-highlight);
}

.button:disabled {
  cursor: progress;
  color: var(--rk-color-text-muted);
  border-color: var(--rk-color-border);
}

.button:focus-visible {
  outline: 2px solid var(--rk-color-focus);
  outline-offset: 2px;
}
</style>
