<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from "vue";
import type { QuerySuggestion } from "./query-suggestion.ts";

const props = withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
    name?: string;
    prompt?: string;
    suggestions?: readonly QuerySuggestion[];
    hint?: string | null;
  }>(),
  {
    label: "Search cards",
    placeholder: "",
    name: "q",
    prompt: "›",
    suggestions: () => [],
    hint: null,
  },
);

const query = defineModel<string>({ required: true });
const emit = defineEmits<{ submit: [query: string]; caret: [position: number] }>();

const input = useTemplateRef<HTMLInputElement>("input");
const id = useId();
const focused = ref(false);
const dismissed = ref(false);
const active = ref(-1);

const open = computed(
  () => focused.value && !dismissed.value && (props.suggestions.length > 0 || props.hint !== null),
);
const activeId = computed(() => (open.value && active.value >= 0 ? `${id}-option-${active.value}` : undefined));

watch(
  () => props.suggestions,
  () => {
    active.value = -1;
  },
);

function reportCaret() {
  emit("caret", input.value?.selectionStart ?? query.value.length);
}

function typed() {
  dismissed.value = false;
  reportCaret();
}

async function apply(suggestion: QuerySuggestion) {
  const { start, end } = suggestion.span;
  const caret = start + suggestion.text.length;
  query.value = query.value.slice(0, start) + suggestion.text + query.value.slice(end);
  dismissed.value = false;
  await nextTick();
  input.value?.setSelectionRange(caret, caret);
  emit("caret", caret);
}

function move(step: number) {
  const count = props.suggestions.length;
  if (count === 0) return;
  dismissed.value = false;
  active.value = active.value < 0 && step < 0 ? count - 1 : (active.value + step + count) % count;
}

function keydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if (props.suggestions.length === 0) return;
    event.preventDefault();
    move(event.key === "ArrowDown" ? 1 : -1);
  } else if (event.key === "Escape" && open.value) {
    event.preventDefault();
    dismissed.value = true;
  } else if (event.key === "Tab" && !event.shiftKey && open.value && props.suggestions.length > 0) {
    event.preventDefault();
    void apply(props.suggestions[Math.max(active.value, 0)] as QuerySuggestion);
  } else if (event.key === "Enter" && open.value && active.value >= 0) {
    event.preventDefault();
    void apply(props.suggestions[active.value] as QuerySuggestion);
  }
}

function submit() {
  dismissed.value = true;
  emit("submit", query.value.trim());
}
</script>

<template>
  <form class="search" role="search" @submit.prevent="submit">
    <label class="field">
      <span class="label">{{ label }}</span>
      <span class="prompt" aria-hidden="true">{{ prompt }}</span>
      <input
        ref="input"
        v-model="query"
        class="input"
        :name="name"
        type="search"
        :placeholder="placeholder"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        aria-autocomplete="list"
        :aria-controls="open ? `${id}-suggestions` : undefined"
        :aria-activedescendant="activeId"
        :aria-describedby="open && hint ? `${id}-hint` : undefined"
        @input="typed"
        @click="reportCaret"
        @keyup="reportCaret"
        @keydown="keydown"
        @focus="
          focused = true;
          reportCaret();
        "
        @blur="focused = false"
      />
    </label>
    <button class="button" type="submit">Search</button>
    <div v-if="open" class="popover">
      <p v-if="hint" :id="`${id}-hint`" class="hint">{{ hint }}</p>
      <div
        v-if="suggestions.length > 0"
        :id="`${id}-suggestions`"
        class="options"
        role="listbox"
        :aria-label="`${label} suggestions`"
      >
        <div
          v-for="(suggestion, index) in suggestions"
          :id="`${id}-option-${index}`"
          :key="suggestion.label"
          class="option"
          :class="{ active: index === active }"
          role="option"
          tabindex="-1"
          :aria-selected="index === active"
          @mousedown.prevent
          @click="apply(suggestion)"
          @keydown.enter="apply(suggestion)"
        >
          <span class="option-label">{{ suggestion.label }}</span>
          <span v-if="suggestion.detail" class="option-detail">{{ suggestion.detail }}</span>
        </div>
      </div>
      <p v-if="suggestions.length > 0" class="keys" aria-hidden="true">Tab completes · ↑↓ choose · Esc closes</p>
    </div>
  </form>
</template>

<style scoped>
.search {
  position: relative;
  z-index: 2;
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

.popover {
  position: absolute;
  top: calc(100% + var(--rk-space-1));
  right: 0;
  left: 0;
  max-height: 20rem;
  padding: var(--rk-space-1);
  overflow-y: auto;
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-surface);
  box-shadow: 0 12px 40px var(--rk-glass-shadow);
  font-family: var(--rk-font-family-mono);
  font-size: var(--rk-font-size-xs);
  font-variant-ligatures: none;
}

.hint {
  margin: 0;
  padding: var(--rk-space-2) var(--rk-space-3);
  color: var(--rk-color-text-muted);
  overflow-wrap: anywhere;
}

.options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 13rem), 1fr));
}

.option {
  display: flex;
  gap: var(--rk-space-3);
  align-items: baseline;
  min-height: var(--rk-control-height-sm);
  align-content: center;
  flex-wrap: wrap;
  padding: var(--rk-space-1) var(--rk-space-3);
  border-radius: var(--rk-radius-md);
  color: var(--rk-color-text);
  cursor: pointer;
}

.option.active {
  background: var(--rk-color-surface-muted);
}

@media (hover: hover) {
  .option:hover {
    background: var(--rk-color-surface-muted);
  }
}

.option-label {
  font-size: var(--rk-font-size-sm);
}

.option-detail {
  color: var(--rk-color-text-muted);
}

.keys {
  display: none;
  margin: 0;
  padding: var(--rk-space-2) var(--rk-space-3) var(--rk-space-1);
  border-top: var(--rk-border-width) solid var(--rk-color-border);
  color: var(--rk-color-text-muted);
}

@media (hover: hover) and (pointer: fine) {
  .keys {
    display: block;
  }
}
</style>
