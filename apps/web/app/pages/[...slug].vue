<script setup lang="ts">
import { AppShell, BackLink, Hero, SiteFooter, StatusMessage, ThemeButton } from "@riftkeeper/ui";
import { useTheme } from "~/composables/theme";
import { RIOT_NOTICE } from "~/utils/riot-notice";

const theme = useTheme();

useHead({ title: "Page not found · Riftkeeper" });
</script>

<template>
  <AppShell>
    <Hero eyebrow="Riftkeeper" title="Page not found" compact>
      <template #actions>
        <ThemeButton v-model="theme" />
      </template>
    </Hero>
    <BackLink href="/" label="Back to search" @navigate="navigateTo" />
    <StatusMessage kind="empty" title="Page not found" detail="There is nothing at this address." />
    <template #footer>
      <SiteFooter :notice="RIOT_NOTICE" />
    </template>
  </AppShell>
</template>
