<template>
  <div class="toolbar">
    <slot />
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--rk-space-3);
}

@media (min-width: 40rem) {
  .toolbar {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--rk-space-2) var(--rk-space-4);
  }
}
</style>
