<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { isPlainLeftClick } from "./link-click.ts";
import type { NavLink } from "./nav-link.ts";
import ThemeButton from "./ThemeButton.vue";
import type { ThemePreference } from "./theme.ts";

withDefaults(
  defineProps<{
    links?: readonly NavLink[];
    brand?: string;
    brandHref?: string;
    label?: string;
    placeholder?: string;
  }>(),
  { links: () => [], brand: "Riftkeeper", brandHref: "/", label: "Search cards", placeholder: "Search cards…" },
);

const query = defineModel<string>({ default: "" });
const theme = defineModel<ThemePreference>("theme", { required: true });
const emit = defineEmits<{ search: [query: string]; navigate: [href: string] }>();

const form = useTemplateRef<HTMLFormElement>("form");
const input = useTemplateRef<HTMLInputElement>("input");
const searching = ref(false);

const TYPING_TARGETS = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

function follow(event: MouseEvent, href: string) {
  if (!isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", href);
}

function submit() {
  emit("search", query.value.trim());
}

async function openSearch() {
  searching.value = true;
  await nextTick();
  input.value?.focus();
}

function closeSearch() {
  searching.value = false;
}

function closeWhenFocusLeaves(event: FocusEvent) {
  if (!form.value?.contains(event.relatedTarget as Node | null)) closeSearch();
}

function cancelSearch() {
  closeSearch();
  input.value?.blur();
}

function focusOnSlash(event: KeyboardEvent) {
  if (event.key !== "/" || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof Element && event.target.closest(TYPING_TARGETS)) return;
  event.preventDefault();
  void openSearch();
}

onMounted(() => window.addEventListener("keydown", focusOnSlash));
onBeforeUnmount(() => window.removeEventListener("keydown", focusOnSlash));
</script>

<template>
  <header class="navbar" :class="{ searching }">
    <nav class="inner" aria-label="Site">
      <a class="brand" :href="brandHref" @click="follow($event, brandHref)">{{ brand }}</a>
      <form ref="form" class="search" role="search" @submit.prevent="submit" @focusout="closeWhenFocusLeaves">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <input
          ref="input"
          v-model="query"
          class="input"
          name="q"
          type="search"
          :aria-label="label"
          :placeholder="placeholder"
          aria-keyshortcuts="/"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          @keydown.escape="cancelSearch"
        />
        <kbd class="key" aria-hidden="true">/</kbd>
      </form>
      <button class="open-search" type="button" :aria-label="label" @click="openSearch">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <div class="links">
        <a
          v-for="link in links"
          :key="link.href"
          class="link"
          :href="link.href"
          :aria-current="link.current ? 'true' : undefined"
          @click="follow($event, link.href)"
          >{{ link.label }}</a
        >
        <ThemeButton v-model="theme" />
      </div>
    </nav>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 0.375rem var(--rk-gutter);
  border-bottom: var(--rk-border-width) solid var(--rk-glass-edge);
  background: color-mix(in srgb, var(--rk-color-background) 82%, transparent);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
}

.inner {
  display: flex;
  gap: var(--rk-space-4);
  align-items: center;
  justify-content: space-between;
  width: min(100%, var(--rk-page-width, var(--rk-content-width)));
  margin-inline: auto;
}

.brand {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  min-height: var(--rk-control-height-sm);
  border-radius: var(--rk-radius-control);
  color: var(--rk-color-text);
  font: var(--rk-font-weight-bold) var(--rk-font-size-md) var(--rk-font-family);
  letter-spacing: 0.1em;
  text-decoration: none;
  text-transform: uppercase;
}

.search {
  display: flex;
  flex: 1;
  gap: var(--rk-space-2);
  align-items: center;
  max-width: 26rem;
  padding: 0 var(--rk-space-2) 0 var(--rk-space-3);
  border: var(--rk-border-width) solid transparent;
  border-radius: calc(var(--rk-radius-card) * 2.5);
  background: color-mix(in srgb, var(--rk-color-text) 6%, transparent);
  transition:
    border-color var(--rk-duration-fast) ease,
    background-color var(--rk-duration-fast) ease,
    box-shadow var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .search:hover {
    border-color: var(--rk-glass-edge);
  }

  .link:hover {
    color: var(--rk-color-text);
  }
}

.search:focus-within {
  border-color: var(--rk-color-domain-strong);
  background: var(--rk-color-surface);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--rk-color-domain) 22%, transparent);
}

.icon {
  flex: none;
  width: 0.95rem;
  height: 0.95rem;
  color: var(--rk-color-text-muted);
}

.input {
  flex: 1;
  min-width: 0;
  min-height: max(2.125rem, var(--rk-control-height-sm));
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--rk-color-text);
  font: var(--rk-font-size-input) var(--rk-font-family);
}

.input::placeholder {
  color: var(--rk-color-text-muted);
}

.input::-webkit-search-cancel-button {
  appearance: none;
}

.key {
  display: none;
  place-items: center;
  min-width: 1.375rem;
  height: 1.375rem;
  padding: 0 var(--rk-space-1);
  border: var(--rk-border-width) solid var(--rk-glass-edge);
  border-bottom-width: 2px;
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-surface);
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) / 1 var(--rk-font-family-mono);
}

@media (hover: hover) and (pointer: fine) {
  .key {
    display: grid;
  }

  .input {
    font-size: var(--rk-font-size-sm);
  }
}

.search:focus-within .key {
  visibility: hidden;
}

.open-search {
  display: none;
  align-items: center;
  justify-content: center;
  width: var(--rk-control-height-sm);
  height: var(--rk-control-height-sm);
  margin-left: auto;
  padding: 0;
  border: none;
  border-radius: var(--rk-radius-control);
  background: none;
  color: var(--rk-color-text);
  cursor: pointer;
}

.open-search .icon {
  width: 1.1rem;
  height: 1.1rem;
  color: inherit;
}

.links {
  display: flex;
  flex-shrink: 0;
  gap: var(--rk-space-1);
  align-items: center;
}

.link {
  display: inline-flex;
  align-items: center;
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-3);
  border-radius: 999px;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family);
  text-decoration: none;
  transition: color var(--rk-duration-fast) ease;
}

.link[aria-current="true"] {
  background: color-mix(in srgb, var(--rk-color-domain) 14%, transparent);
  color: var(--rk-color-text);
}

.brand:focus-visible,
.link:focus-visible,
.open-search:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
}

@media (max-width: 39.99rem) {
  .search {
    display: none;
    max-width: none;
  }

  .open-search {
    display: inline-flex;
  }

  .searching .search {
    display: flex;
  }

  .searching .brand,
  .searching .open-search,
  .searching .links {
    display: none;
  }
}
</style>
