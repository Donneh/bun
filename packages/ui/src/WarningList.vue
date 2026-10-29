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
  border: 1px solid var(--rk-color-warning-border);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-warning-surface);
  color: var(--rk-color-warning-text);
  font-size: var(--rk-font-size-sm);
}

.warning + .warning {
  margin-top: var(--rk-space-1);
}
</style>
