<script setup lang="ts">
withDefaults(defineProps<{ label?: string; placeholder?: string; name?: string; prompt?: string }>(), {
  label: "Search cards",
  placeholder: "",
  name: "q",
  prompt: "›",
});

const query = defineModel<string>({ required: true });
const emit = defineEmits<{ submit: [query: string] }>();
</script>

<template>
  <form class="search" role="search" @submit.prevent="emit('submit', query.trim())">
    <label class="field">
      <span class="label">{{ label }}</span>
      <span class="prompt" aria-hidden="true">{{ prompt }}</span>
      <input
        v-model="query"
        class="input"
        :name="name"
        type="search"
        :placeholder="placeholder"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
    </label>
    <button class="button" type="submit">Search</button>
  </form>
</template>

<style scoped>
.search {
  display: flex;
  gap: var(--rk-space-1);
  padding: var(--rk-space-1);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-surface);
  transition:
    border-color var(--rk-duration-fast) ease,
    box-shadow var(--rk-duration-fast) ease;
}

.search:focus-within {
  border-color: var(--rk-color-accent);
  box-shadow: 0 0 0 3px var(--rk-color-focus-ring);
}

@media (hover: hover) {
  .search:hover {
    border-color: var(--rk-color-accent);
  }
}

.field {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  cursor: text;
}

.label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.prompt {
  padding-inline: var(--rk-space-2) var(--rk-space-1);
  color: var(--rk-color-accent);
  font-family: var(--rk-font-family-mono);
  font-size: var(--rk-font-size-prompt);
  line-height: 1;
}

.input {
  flex: 1;
  min-width: 0;
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-2);
  border: none;
  background: transparent;
  color: var(--rk-color-text);
  font-family: var(--rk-font-family-mono);
  font-size: var(--rk-font-size-input);
  font-variant-ligatures: none;
  outline: none;
}

.input::placeholder {
  color: var(--rk-color-text-muted);
}

.input::-webkit-search-cancel-button {
  appearance: none;
}

.button {
  flex-shrink: 0;
  padding: 0 var(--rk-space-4);
  border: var(--rk-border-width) solid var(--rk-color-text);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-text);
  color: var(--rk-color-background);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family-mono);
  cursor: pointer;
  transition:
    background-color var(--rk-duration-fast) ease,
    border-color var(--rk-duration-fast) ease,
    color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .button:hover {
    border-color: var(--rk-color-accent);
    background: var(--rk-color-accent);
    color: var(--rk-color-on-accent);
  }
}

.button:active {
  border-color: var(--rk-color-accent);
  background: var(--rk-color-accent);
  color: var(--rk-color-on-accent);
}

.button:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}
</style>
