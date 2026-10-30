<template>
  <div class="shell">
    <main class="main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow-x: clip;
  background: var(--rk-color-background);
  color: var(--rk-color-text);
}

.main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--rk-space-5);
  width: calc(100% - 2 * var(--rk-gutter));
  max-width: var(--rk-content-width);
  margin-inline: auto;
  padding-block: 0 var(--rk-space-8);
}
</style>
