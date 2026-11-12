<script setup lang="ts">
import { useId } from "vue";
import { copies, type ImportMode, type ImportOption, type ImportPreview, printings } from "./collection.ts";
import GlassPanel from "./GlassPanel.vue";

withDefaults(
  defineProps<{
    preview?: ImportPreview | null;
    error?: string | null;
    notice?: string | null;
    exportable?: boolean;
  }>(),
  { preview: null, error: null, notice: null, exportable: true },
);

const emit = defineEmits<{ export: []; choose: [file: File]; apply: [mode: ImportMode]; cancel: [] }>();

const headingId = useId();
const previewHeadingId = useId();

const MODES: Record<ImportMode, { readonly label: string; readonly description: string }> = {
  merge: { label: "Merge", description: "Printings in the file take its counts; the rest stay." },
  replace: { label: "Replace", description: "The collection becomes exactly the file." },
};

function chooseFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const [file] = input.files ?? [];
  if (file) emit("choose", file);
  input.value = "";
}

const changeLine = (option: ImportOption) =>
  [`${option.added} added`, `${option.changed} changed`, `${option.removed} removed`].join(" · ");
</script>

<template>
  <GlassPanel tag="section" class="transfer" :aria-labelledby="headingId">
    <div class="head">
      <h2 :id="headingId" class="title">Export and import</h2>
      <div class="actions">
        <button class="button" type="button" :disabled="!exportable" @click="emit('export')">Export</button>
        <label class="button">
          <span>Import</span>
          <input class="file" type="file" accept="application/json,.json" @change="chooseFile" />
        </label>
      </div>
    </div>
    <p v-if="error" class="message error" role="alert">{{ error }}</p>
    <p v-else-if="notice" class="message" role="status">{{ notice }}</p>
    <section v-if="preview" class="preview" :aria-labelledby="previewHeadingId">
      <h3 :id="previewHeadingId" class="preview-title">
        Import {{ preview.fileName }} <span class="muted">({{ printings(preview.printings) }})</span>
      </h3>
      <ul class="options">
        <li v-for="option in preview.options" :key="option.mode" class="option">
          <p class="option-title">{{ MODES[option.mode].label }}</p>
          <p class="muted">{{ MODES[option.mode].description }}</p>
          <p class="changes">{{ changeLine(option) }}</p>
          <p class="muted">
            Afterwards: {{ copies(option.copies) }}, {{ printings(option.wishlist) }} on the wishlist
          </p>
          <button class="button primary" type="button" @click="emit('apply', option.mode)">
            {{ MODES[option.mode].label }}
          </button>
        </li>
      </ul>
      <button class="button" type="button" @click="emit('cancel')">Cancel import</button>
    </section>
  </GlassPanel>
</template>

<style scoped>
.transfer {
  display: grid;
  gap: var(--rk-space-4);
  padding: var(--rk-space-5) var(--rk-space-6);
}

.head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-3);
  align-items: center;
  justify-content: space-between;
}

.title {
  margin: 0;
  font: var(--rk-font-weight-bold) var(--rk-font-size-lg) var(--rk-font-family);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
}

.button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-4);
  border: var(--rk-border-width) solid var(--rk-glass-edge);
  border-radius: 999px;
  background: color-mix(in srgb, var(--rk-color-text) 4%, transparent);
  color: var(--rk-color-text);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family);
  cursor: pointer;
  transition:
    border-color var(--rk-duration-fast) ease,
    background-color var(--rk-duration-fast) ease;
}

.button:disabled {
  color: var(--rk-color-text-muted);
  cursor: default;
  opacity: 0.6;
}

.button.primary {
  border-color: var(--rk-color-accent);
  background: var(--rk-color-accent);
  color: var(--rk-color-on-accent);
}

@media (hover: hover) {
  .button:not(:disabled):hover {
    border-color: var(--rk-color-domain-strong);
  }
}

.button:focus-visible,
.button:focus-within:has(.file:focus-visible) {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
}

.file {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  clip-path: inset(50%);
}

.message {
  margin: 0;
  padding: var(--rk-space-3) var(--rk-space-4);
  border: var(--rk-border-width) solid var(--rk-glass-edge);
  border-radius: var(--rk-radius-lg);
  font-size: var(--rk-font-size-sm);
  overflow-wrap: anywhere;
}

.message.error {
  border-color: var(--rk-color-danger-border);
  background: var(--rk-color-danger-surface);
  color: var(--rk-color-danger-text);
}

.preview {
  display: grid;
  gap: var(--rk-space-3);
  padding-top: var(--rk-space-4);
  border-top: var(--rk-border-width) solid var(--rk-glass-edge);
}

.preview-title {
  margin: 0;
  font-size: var(--rk-font-size-body);
  overflow-wrap: anywhere;
}

.options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: var(--rk-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.option {
  display: grid;
  gap: var(--rk-space-1);
  align-content: start;
  padding: var(--rk-space-4);
  border: var(--rk-border-width) solid var(--rk-glass-edge);
  border-radius: var(--rk-radius-lg);
}

.option .button {
  margin-top: var(--rk-space-2);
}

.option p {
  margin: 0;
}

.option-title {
  font-weight: var(--rk-font-weight-bold);
}

.changes {
  font: var(--rk-font-size-sm) var(--rk-font-family-mono);
}

.muted {
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
  font-weight: var(--rk-font-weight-regular);
}

@media (max-width: 47.99rem) {
  .transfer {
    padding-inline: var(--rk-space-4);
  }
}
</style>
