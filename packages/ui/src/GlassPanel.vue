<script setup lang="ts">
withDefaults(defineProps<{ tag?: string }>(), { tag: "div" });
</script>

<template>
  <component :is="tag" class="panel rk-glass">
    <slot />
  </component>
</template>

<style scoped>
.panel {
  overflow: hidden;
  border-radius: var(--rk-radius-card);
}
</style>
