<script setup lang="ts">
import { AppShell, BackLink, SiteFooter, SiteNavbar, StatusMessage } from "@riftkeeper/ui";
import { useTheme } from "~/composables/theme";
import { RIOT_NOTICE } from "~/utils/riot-notice";

const theme = useTheme();
const { links: navLinks, query: navQuery, navigate, search } = useSiteNavigation(null);

useHead({ title: "Page not found · Riftkeeper" });
</script>

<template>
  <AppShell title="Page not found">
    <template #header>
      <SiteNavbar v-model="navQuery" v-model:theme="theme" :links="navLinks" @search="search" @navigate="navigate" />
    </template>
    <BackLink variant="button" href="/" label="Back to search" @navigate="navigateTo" />
    <StatusMessage kind="empty" title="Page not found" detail="There is nothing at this address." />
    <template #footer>
      <SiteFooter :notice="RIOT_NOTICE" />
    </template>
  </AppShell>
</template>
