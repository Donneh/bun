<script setup lang="ts">
import { computed } from "vue";
import { nextThemePreference, type ThemePreference } from "./theme.ts";

const preference = defineModel<ThemePreference>({ required: true });

const name = computed(() => `Theme: ${preference.value}`);

function cycle() {
  preference.value = nextThemePreference(preference.value);
}
</script>

<template>
  <button class="theme" type="button" :aria-label="name" :title="name" @click="cycle">
    <svg
      class="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <template v-if="preference === 'system'">
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M8 20h8M12 16v4" />
      </template>
      <template v-else-if="preference === 'light'">
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        />
      </template>
      <path v-else d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  </button>
</template>

<style scoped>
.theme {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--rk-control-height-sm);
  height: var(--rk-control-height-sm);
  padding: 0;
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  cursor: pointer;
  transition:
    border-color var(--rk-duration-fast) ease,
    color var(--rk-duration-fast) ease;
}

.icon {
  width: 1rem;
  height: 1rem;
}

@media (hover: hover) {
  .theme:hover {
    border-color: var(--rk-color-accent);
    color: var(--rk-color-accent-text);
  }
}

.theme:focus-visible {
  border-color: var(--rk-color-accent);
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}
</style>
