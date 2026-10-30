<script setup lang="ts">
import { isPlainLeftClick } from "./link-click.ts";

const props = withDefaults(defineProps<{ href: string; label?: string }>(), { label: "Back to results" });

const emit = defineEmits<{ navigate: [href: string] }>();

function followLink(event: MouseEvent) {
  if (!isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", props.href);
}
</script>

<template>
  <a class="back" :href="href" @click="followLink">
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
  padding: 0 var(--rk-space-3) 0 var(--rk-space-2);
  margin-left: calc(-1 * var(--rk-space-2));
  border-radius: var(--rk-radius-md);
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
  text-decoration: none;
  transition: color var(--rk-duration-fast) ease;
}

.arrow {
  transition: transform var(--rk-duration-fast) ease-out;
}

@media (hover: hover) {
  .back:hover {
    color: var(--rk-color-text);
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

@media (prefers-reduced-motion: reduce) {
  .arrow {
    transition: none;
  }

  .back:hover .arrow {
    transform: none;
  }
}
</style>
