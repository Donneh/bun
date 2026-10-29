<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <div class="shell">
    <header class="header">
      <h1 class="title">{{ title }}</h1>
    </header>
    <main class="main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  background: var(--rk-color-background);
  color: var(--rk-color-text);
}

.header {
  border-bottom: 1px solid var(--rk-color-border);
  background: var(--rk-color-surface);
  padding: var(--rk-space-4) var(--rk-space-6);
}

.title {
  margin: 0;
  max-width: var(--rk-content-width);
  margin-inline: auto;
  font-size: var(--rk-font-size-lg);
  font-weight: var(--rk-font-weight-bold);
}

.main {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-4);
  max-width: var(--rk-content-width);
  margin-inline: auto;
  padding: var(--rk-space-6);
}
</style>
