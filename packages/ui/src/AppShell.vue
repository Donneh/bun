<template>
  <div class="shell">
    <main class="main">
      <slot />
    </main>
    <footer v-if="$slots.footer" class="footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--rk-color-background);
  color: var(--rk-color-text);
}

.main,
.footer {
  width: calc(100% - 2 * var(--rk-gutter));
  max-width: var(--rk-content-width);
  margin-inline: auto;
}

.main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--rk-space-5);
  padding-block: 0 var(--rk-space-8);
}

.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--rk-space-3);
  padding-block: var(--rk-space-4) var(--rk-space-6);
  border-top: var(--rk-border-width) solid var(--rk-color-border);
}
</style>
