<script setup lang="ts">
import { AppShell, BackLink, Hero, StatusMessage, ThemeButton } from "@riftkeeper/ui";
import { useTheme } from "~/composables/theme";

const theme = useTheme();

useHead({ title: "Page not found · Riftkeeper" });
</script>

<template>
  <AppShell>
    <Hero eyebrow="Riftkeeper" compact>
      <template #actions>
        <ThemeButton v-model="theme" />
      </template>
    </Hero>
    <BackLink href="/" label="Back to search" @navigate="navigateTo" />
    <StatusMessage kind="empty" title="Page not found" detail="There is nothing at this address." />
  </AppShell>
</template>
