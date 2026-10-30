<script setup lang="ts">
defineProps<{ kind: "loading" | "empty" | "error"; title: string; detail?: string; action?: string }>();
const emit = defineEmits<{ action: [] }>();
</script>

<template>
  <section class="status" :class="kind" :role="kind === 'error' ? 'alert' : 'status'" :aria-busy="kind === 'loading'">
    <p class="title">{{ title }}</p>
    <p v-if="detail" class="detail">{{ detail }}</p>
    <slot />
    <button v-if="action" class="action" type="button" @click="emit('action')">{{ action }}</button>
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

.action {
  align-self: flex-start;
  min-height: var(--rk-control-height-sm);
  margin-top: var(--rk-space-2);
  padding: 0 var(--rk-space-4);
  border: var(--rk-border-width) solid currentColor;
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-surface);
  color: inherit;
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family-mono);
  cursor: pointer;
  transition:
    border-color var(--rk-duration-fast) ease,
    color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .action:hover {
    border-color: var(--rk-color-accent);
    color: var(--rk-color-text);
  }
}

.action:focus-visible {
  border-color: var(--rk-color-accent);
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}
</style>
