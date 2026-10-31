<script setup lang="ts">
import { isPlainLeftClick } from "./link-click.ts";

const props = withDefaults(defineProps<{ href: string; label?: string; variant?: "plain" | "button" }>(), {
  label: "Back to results",
  variant: "plain",
});

const emit = defineEmits<{ navigate: [href: string] }>();

function followLink(event: MouseEvent) {
  if (!isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", props.href);
}
</script>

<template>
  <a class="back" :class="variant === 'button' ? 'button rk-glass' : 'plain'" :href="href" @click="followLink">
    <span class="arrow" aria-hidden="true">←</span>
    <span>{{ label }}</span>
  </a>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: var(--rk-space-2);
  min-height: var(--rk-control-height-sm);
  text-decoration: none;
  transition:
    color var(--rk-duration-fast) ease,
    border-color var(--rk-duration-fast) ease,
    background-color var(--rk-duration-fast) ease;
}

.plain {
  padding: 0 var(--rk-space-3) 0 var(--rk-space-2);
  margin-left: calc(-1 * var(--rk-space-2));
  border-radius: var(--rk-radius-md);
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.button {
  min-height: max(2.5rem, var(--rk-control-height-sm));
  padding: 0 var(--rk-space-4) 0 var(--rk-space-3);
  border-radius: var(--rk-radius-control);
  box-shadow: inset 0 1px 0 var(--rk-glass-highlight);
  color: var(--rk-color-text);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family);
}

.arrow {
  transition: transform var(--rk-duration-fast) ease-out;
}

@media (hover: hover) {
  .back:hover {
    color: var(--rk-color-text);
  }

  .button:hover {
    border-color: var(--rk-color-domain-strong);
    background: color-mix(in srgb, var(--rk-color-domain) 10%, var(--rk-glass-fill));
  }

  .back:hover .arrow {
    transform: translateX(calc(-1 * var(--rk-space-1)));
  }
}

.back:focus-visible {
  color: var(--rk-color-text);
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 0;
}

.button:focus-visible {
  border-color: var(--rk-color-domain-strong);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .arrow {
    transition: none;
  }

  .back:hover .arrow {
    transform: none;
  }
}
</style>
