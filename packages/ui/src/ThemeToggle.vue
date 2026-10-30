<script setup lang="ts">
import { THEME_PREFERENCES, type ThemePreference } from "./theme.ts";

withDefaults(defineProps<{ label?: string }>(), { label: "Theme" });

const preference = defineModel<ThemePreference>({ required: true });

const LABELS: Record<ThemePreference, string> = { system: "System", light: "Light", dark: "Dark" };
</script>

<template>
  <fieldset class="toggle">
    <legend class="legend">{{ label }}</legend>
    <div class="options">
      <button
        v-for="option in THEME_PREFERENCES"
        :key="option"
        class="option"
        type="button"
        :aria-pressed="preference === option"
        @click="preference = option"
      >
        {{ LABELS[option] }}
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.toggle {
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: none;
}

.legend {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.options {
  display: inline-flex;
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-surface);
}

.option {
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-3);
  border: var(--rk-border-width) solid transparent;
  border-radius: var(--rk-radius-md);
  background: transparent;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-detail);
  cursor: pointer;
  transition:
    border-color var(--rk-duration-fast) ease,
    color var(--rk-duration-fast) ease;
}

.option[aria-pressed="true"] {
  background: var(--rk-color-text);
  color: var(--rk-color-background);
}

@media (hover: hover) {
  .option:hover {
    border-color: var(--rk-color-accent);
    color: var(--rk-color-text);
  }

  .option[aria-pressed="true"]:hover {
    color: var(--rk-color-background);
  }
}

.option:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}
</style>
