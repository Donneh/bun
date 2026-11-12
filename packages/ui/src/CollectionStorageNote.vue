<script setup lang="ts">
import { computed } from "vue";
import type { CollectionStorage } from "./collection.ts";

const props = withDefaults(defineProps<{ state: CollectionStorage; backupKey?: string | null }>(), {
  backupKey: null,
});

const UNREADABLE = "The collection stored in this browser could not be read.";

const MESSAGES: Record<CollectionStorage, string> = {
  saved: "Saved in this browser only.",
  blocked: "This browser blocks storage, so the collection is lost when the page reloads.",
  failed: "The last change could not be saved in this browser, so it is lost when the page reloads.",
  unreadable: `${UNREADABLE} Only its readable entries show, and the original is copied to a backup before the next change.`,
  protected: `${UNREADABLE} No backup of it could be made, so changes are not saved.`,
  recovered: `${UNREADABLE} The original is kept in this browser as a backup.`,
};

const message = computed(() =>
  props.state === "recovered" && props.backupKey
    ? `${UNREADABLE} The original is kept in this browser under ${props.backupKey}.`
    : MESSAGES[props.state],
);
</script>

<template>
  <p class="note" :class="{ warning: state !== 'saved' }">
    {{ message }}
  </p>
</template>

<style scoped>
.note {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-detail);
  overflow-wrap: anywhere;
}

.note.warning {
  color: var(--rk-color-warning-text);
}
</style>
