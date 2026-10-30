<script setup lang="ts">
import { useId } from "vue";
import type { PrintingSummary } from "./card-detail.ts";

withDefaults(defineProps<{ printings: readonly PrintingSummary[]; selected: string; label?: string }>(), {
  label: "Printings",
});

const emit = defineEmits<{ select: [id: string] }>();

const headingId = useId();
</script>

<template>
  <section class="printings">
    <h2 :id="headingId" class="heading">{{ label }}</h2>
    <ul class="list" :aria-labelledby="headingId">
      <li v-for="printing in printings" :key="printing.id">
        <button
          class="printing"
          type="button"
          :aria-pressed="printing.id === selected"
          @click="emit('select', printing.id)"
        >
          <span class="title">
            <span class="set">{{ printing.setName }}</span>
            <span class="code">{{ printing.code }}</span>
          </span>
          <span class="details">{{ printing.details.join(" · ") }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.printings {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-3);
}

.heading {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
  font-weight: var(--rk-font-weight-regular);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.printing {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-1);
  width: 100%;
  min-height: var(--rk-control-height);
  padding: var(--rk-space-2) var(--rk-space-3);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition:
    border-color var(--rk-duration-fast) ease,
    background-color var(--rk-duration-fast) ease;
}

.printing[aria-pressed="true"] {
  border-color: var(--rk-color-accent);
  box-shadow: inset 0 0 0 var(--rk-border-width) var(--rk-color-accent);
}

@media (hover: hover) {
  .printing:hover {
    border-color: var(--rk-color-accent);
  }
}

.printing:focus-visible {
  border-color: var(--rk-color-accent);
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}

.title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0 var(--rk-space-3);
}

.set {
  font-size: var(--rk-font-size-md);
  font-weight: var(--rk-font-weight-bold);
}

.code,
.details {
  color: var(--rk-color-text-muted);
  font-family: var(--rk-font-family-detail);
  font-size: var(--rk-font-size-xs);
  overflow-wrap: anywhere;
}
</style>
