<script setup lang="ts">
defineProps<{ label: string; href?: string }>();
</script>

<template>
  <aside class="preview" aria-label="Preview">
    <strong class="name">Preview</strong>
    <a v-if="href" class="label" :href="href">{{ label }}</a>
    <span v-else class="label">{{ label }}</span>
  </aside>
</template>

<style scoped>
.preview {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
  justify-content: center;
  padding: var(--rk-space-2) var(--rk-gutter);
  border-bottom: var(--rk-border-width) solid var(--rk-color-warning-border);
  background: var(--rk-color-warning-surface);
  color: var(--rk-color-warning-text);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
  overflow-wrap: anywhere;
}

.name {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.label {
  color: inherit;
}
</style>
