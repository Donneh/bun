<script setup lang="ts">
withDefaults(defineProps<{ queries: readonly string[]; lead?: string; label?: string }>(), {
  lead: "Try",
  label: "Example queries",
});

const emit = defineEmits<{ select: [query: string] }>();
</script>

<template>
  <div v-if="queries.length > 0" class="examples">
    <span class="lead" aria-hidden="true">{{ lead }} <span class="prompt">›</span></span>
    <ul class="queries" :aria-label="label">
      <li v-for="query in queries" :key="query" class="item">
        <button class="example" type="button" :aria-label="`Search ${query}`" @click="emit('select', query)">
          {{ query }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.examples {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
  font-variant-ligatures: none;
}

.lead {
  margin-inline-end: var(--rk-space-1);
  white-space: nowrap;
}

.prompt {
  color: var(--rk-color-accent-text);
}

.queries {
  display: inline;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  vertical-align: middle;
}

.item:not(:last-child)::after {
  content: "·" / "";
  padding-inline: var(--rk-space-1);
}

.example {
  min-height: var(--rk-control-height-sm);
  max-width: 100%;
  padding: 0 var(--rk-space-1);
  border: none;
  border-radius: var(--rk-radius-sm);
  background: transparent;
  color: var(--rk-color-text);
  font: inherit;
  text-align: start;
  text-decoration: underline;
  text-decoration-color: var(--rk-color-border);
  text-underline-offset: 0.25em;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition:
    color var(--rk-duration-fast) ease,
    text-decoration-color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .example:hover {
    color: var(--rk-color-accent-text);
    text-decoration-color: currentColor;
  }
}

.example:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 0;
}
</style>
