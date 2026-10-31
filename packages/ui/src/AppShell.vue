<script setup lang="ts">
defineProps<{ title?: string | undefined }>();
</script>

<template>
  <div class="shell" :class="{ 'with-header': $slots.header }">
    <slot name="backdrop" />
    <slot name="header" />
    <main class="main">
      <h1 v-if="title" class="visually-hidden">{{ title }}</h1>
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

.with-header .main {
  padding-top: var(--rk-space-10);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
