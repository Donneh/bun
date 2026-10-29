<script setup lang="ts">
withDefaults(defineProps<{ label?: string; placeholder?: string; name?: string }>(), {
  label: "Search cards",
  placeholder: "",
  name: "q",
});

const query = defineModel<string>({ required: true });
const emit = defineEmits<{ submit: [query: string] }>();
</script>

<template>
  <form class="search" role="search" @submit.prevent="emit('submit', query.trim())">
    <label class="field">
      <span class="label">{{ label }}</span>
      <input
        v-model="query"
        class="input"
        :name="name"
        type="search"
        :placeholder="placeholder"
        autocomplete="off"
        spellcheck="false"
      />
    </label>
    <button class="button" type="submit">Search</button>
  </form>
</template>

<style scoped>
.search {
  display: flex;
  gap: var(--rk-space-2);
  align-items: flex-end;
}

.field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--rk-space-1);
}

.label {
  font-size: var(--rk-font-size-sm);
  color: var(--rk-color-text-muted);
}

.input,
.button {
  font: inherit;
  border-radius: var(--rk-radius-md);
  padding: var(--rk-space-2) var(--rk-space-4);
}

.input {
  border: 1px solid var(--rk-color-border);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
}

.button {
  border: 1px solid var(--rk-color-accent);
  background: var(--rk-color-accent);
  color: var(--rk-color-accent-text);
  font-weight: var(--rk-font-weight-bold);
  cursor: pointer;
}

.input:focus-visible,
.button:focus-visible {
  outline: 2px solid var(--rk-color-focus);
  outline-offset: 2px;
}
</style>
