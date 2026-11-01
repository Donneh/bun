<script setup lang="ts">
import { applyTheme } from "@riftkeeper/ui";
import { useCollection } from "~/composables/collection";
import { useTheme } from "~/composables/theme";
import { browserStorage } from "~/utils/browser-storage";
import { COLLECTION_STORAGE_KEY } from "~/utils/collection";
import { saveThemePreference } from "~/utils/theme-preference";

const theme = useTheme();
watchEffect(() => applyTheme(theme.value));
watch(theme, (preference) => saveThemePreference(browserStorage, preference));

const collection = useCollection();
function followOtherTabs(event: StorageEvent) {
  if (event.key === COLLECTION_STORAGE_KEY || event.key === null) collection.reload();
}
onMounted(() => window.addEventListener("storage", followOtherTabs));
onBeforeUnmount(() => window.removeEventListener("storage", followOtherTabs));
</script>

<template>
  <NuxtPage />
</template>
