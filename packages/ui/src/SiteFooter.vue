<script setup lang="ts">
defineProps<{ notice: string }>();
</script>

<template>
  <footer class="footer">
    <p class="notice">{{ notice }}</p>
  </footer>
</template>

<style scoped>
.footer {
  border-top: var(--rk-border-width) solid var(--rk-color-border);
  padding-block: var(--rk-space-5) var(--rk-space-8);
}

.notice {
  max-width: 48rem;
  margin: 0;
  color: var(--rk-color-text-muted);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
  line-height: var(--rk-line-height);
  overflow-wrap: anywhere;
}
</style>
