<script setup lang="ts">
withDefaults(defineProps<{ narrow?: boolean }>(), { narrow: false });
</script>

<template>
  <div class="shell" :class="{ narrow }">
    <slot name="backdrop" />
    <slot name="header" />
    <main class="main">
      <slot />
    </main>
    <div v-if="$slots.footer" class="end">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.shell {
  --rk-page-width: var(--rk-content-width);

  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow-x: clip;
  background: var(--rk-color-background);
  color: var(--rk-color-text);
}

.shell.narrow {
  --rk-page-width: var(--rk-content-width-narrow);
}

.main,
.end {
  position: relative;
  width: calc(100% - 2 * var(--rk-gutter));
  max-width: var(--rk-page-width);
  margin-inline: auto;
}

.main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--rk-space-5);
  padding-block: 0 var(--rk-space-8);
}
</style>
