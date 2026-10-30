<script setup lang="ts">
defineProps<{ warnings: readonly { readonly message: string }[] }>();
</script>

<template>
  <ul v-if="warnings.length > 0" class="warnings" aria-label="Search warnings">
    <li v-for="(warning, index) in warnings" :key="index" class="warning">{{ warning.message }}</li>
  </ul>
</template>

<style scoped>
.warnings {
  margin: 0;
  padding: var(--rk-space-3) var(--rk-space-4);
  list-style: none;
  border: var(--rk-border-width) solid var(--rk-color-warning-border);
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-warning-surface);
  color: var(--rk-color-warning-text);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
  overflow-wrap: anywhere;
}

.warning + .warning {
  margin-top: var(--rk-space-1);
}
</style>
