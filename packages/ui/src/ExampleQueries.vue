<script setup lang="ts">
withDefaults(defineProps<{ queries: readonly string[]; label?: string }>(), {
  label: "Example queries",
});

const emit = defineEmits<{ select: [query: string] }>();
</script>

<template>
  <ul v-if="queries.length > 0" class="examples" :aria-label="label">
    <li v-for="query in queries" :key="query">
      <button class="example" type="button" :aria-label="`Search ${query}`" @click="emit('select', query)">
        <span class="prompt" aria-hidden="true">›</span>
        <span class="query">{{ query }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.examples {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
  margin: var(--rk-space-2) 0 0;
  padding: 0;
  list-style: none;
}

.example {
  display: inline-flex;
  align-items: center;
  gap: var(--rk-space-2);
  min-height: var(--rk-control-height-sm);
  max-width: 100%;
  padding: 0 var(--rk-space-3);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
  font-variant-ligatures: none;
  text-align: start;
  cursor: pointer;
  transition:
    border-color var(--rk-duration-fast) ease,
    color var(--rk-duration-fast) ease;
}

.prompt {
  color: var(--rk-color-text-muted);
  transition: color var(--rk-duration-fast) ease;
}

.query {
  overflow-wrap: anywhere;
}

@media (hover: hover) {
  .example:hover {
    border-color: var(--rk-color-accent);
  }

  .example:hover .prompt {
    color: var(--rk-color-accent);
  }
}

.example:focus-visible {
  border-color: var(--rk-color-accent);
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}
</style>
