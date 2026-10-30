<script setup lang="ts">
import { applyTheme } from "@riftkeeper/ui";
import { browserStorage, useTheme } from "~/composables/theme";
import { saveThemePreference } from "~/utils/theme-preference";

const theme = useTheme();
watchEffect(() => applyTheme(theme.value));
watch(theme, (preference) => saveThemePreference(browserStorage, preference));
</script>

<template>
  <NuxtPage />
</template>
