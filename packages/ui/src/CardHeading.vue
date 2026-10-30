<script setup lang="ts">
defineProps<{ name: string; subtitle: string | null }>();
</script>

<template>
  <hgroup class="heading">
    <h1 class="name">{{ name }}</h1>
    <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
  </hgroup>
</template>

<style scoped>
.heading {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-1);
  margin: 0;
}

.name {
  margin: 0;
  font-size: var(--rk-font-size-display);
  font-weight: var(--rk-font-weight-bold);
  line-height: var(--rk-line-height-tight);
  letter-spacing: var(--rk-letter-spacing-display);
  overflow-wrap: anywhere;
}

.subtitle {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-lg);
}
</style>
