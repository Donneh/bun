<script setup lang="ts">
import { applyTheme, PreviewBanner } from "@riftkeeper/ui";
import { browserStorage, useTheme } from "~/composables/theme";
import { saveThemePreference } from "~/utils/theme-preference";

const theme = useTheme();
watchEffect(() => applyTheme(theme.value));
watch(theme, (preference) => saveThemePreference(browserStorage, preference));

const { previewLabel, previewHref } = useRuntimeConfig().public;
if (previewLabel) useHead({ meta: [{ name: "robots", content: "noindex" }] });
</script>

<template>
  <PreviewBanner v-if="previewLabel" :label="previewLabel" :href="previewHref || undefined" />
  <NuxtPage />
</template>
