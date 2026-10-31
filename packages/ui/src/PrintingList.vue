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
          <img
            class="thumbnail"
            :src="printing.imageUrl"
            :srcset="printing.srcset"
            sizes="2.5rem"
            alt=""
            loading="lazy"
            decoding="async"
          />
          <span class="name">
            <span class="set">{{ printing.setName }}</span>
            <span class="details">{{ printing.details.join(" · ") }}</span>
          </span>
          <span class="code">{{ printing.code }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.printings {
  display: grid;
  gap: var(--rk-space-3);
}

.heading {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.list {
  display: grid;
  gap: var(--rk-space-1);
  margin: 0 calc(-1 * var(--rk-space-3));
  padding: 0;
  list-style: none;
}

.printing {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--rk-space-3);
  align-items: center;
  width: 100%;
  min-height: var(--rk-control-height-sm);
  padding: var(--rk-space-2) var(--rk-space-3);
  border: none;
  border-radius: var(--rk-radius-inset);
  background: transparent;
  color: var(--rk-color-text);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: background-color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .printing:hover {
    background: color-mix(in srgb, var(--rk-color-text) 5%, transparent);
  }
}

.printing[aria-pressed="true"] {
  background: color-mix(in srgb, var(--rk-color-domain) 12%, transparent);
}

.printing:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 0;
}

.thumbnail {
  display: block;
  width: 2.5rem;
  border-radius: var(--rk-radius-sm);
}

.name {
  display: grid;
  min-width: 0;
}

.set {
  font-size: var(--rk-font-size-md);
  font-weight: var(--rk-font-weight-bold);
}

.details {
  overflow: hidden;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}
</style>
