<script setup lang="ts">
defineProps<{ kind: "loading" | "empty" | "error"; title: string; detail?: string }>();
</script>

<template>
  <section class="status" :class="kind" :role="kind === 'error' ? 'alert' : 'status'" :aria-busy="kind === 'loading'">
    <p class="title">{{ title }}</p>
    <p v-if="detail" class="detail">{{ detail }}</p>
  </section>
</template>

<style scoped>
.status {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-1);
  padding: var(--rk-space-6) var(--rk-space-4);
  border: var(--rk-border-width) dashed var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  color: var(--rk-color-text-muted);
  overflow-wrap: anywhere;
}

.loading {
  padding: 0;
  border: none;
}

.error {
  border: var(--rk-border-width) solid var(--rk-color-danger-border);
  background: var(--rk-color-danger-surface);
  color: var(--rk-color-danger-text);
}

.title {
  margin: 0;
  color: var(--rk-color-text);
  font-size: var(--rk-font-size-body);
  font-weight: var(--rk-font-weight-bold);
}

.error .title {
  color: inherit;
}

.loading .title {
  color: var(--rk-color-text-muted);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
  font-weight: var(--rk-font-weight-regular);
}

.detail {
  margin: 0;
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
}
</style>
