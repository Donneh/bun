<script setup lang="ts">
defineProps<{ kind: "loading" | "empty" | "error"; title: string; detail?: string }>();
</script>

<template>
  <section class="status" :class="kind" :role="kind === 'error' ? 'alert' : 'status'" :aria-busy="kind === 'loading'">
    <span v-if="kind === 'loading'" class="spinner" aria-hidden="true" />
    <p class="title">{{ title }}</p>
    <p v-if="detail" class="detail">{{ detail }}</p>
  </section>
</template>

<style scoped>
.status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--rk-space-2);
  padding: var(--rk-space-8) var(--rk-space-4);
  border: 1px dashed var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  text-align: center;
  color: var(--rk-color-text-muted);
}

.error {
  border: 1px solid var(--rk-color-danger-border);
  background: var(--rk-color-danger-surface);
  color: var(--rk-color-danger-text);
}

.title {
  margin: 0;
  font-size: var(--rk-font-size-lg);
  font-weight: var(--rk-font-weight-bold);
}

.detail {
  margin: 0;
  font-size: var(--rk-font-size-sm);
}

.spinner {
  width: var(--rk-space-6);
  height: var(--rk-space-6);
  border: 3px solid var(--rk-color-border);
  border-top-color: var(--rk-color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 2.4s;
  }
}
</style>
