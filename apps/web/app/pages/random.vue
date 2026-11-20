<script setup lang="ts">
import { AppShell, BackLink, SiteFooter, SiteNavbar, StatusMessage } from "@riftkeeper/ui";
import { useTheme } from "~/composables/theme";
import { cardHref } from "~/utils/card-detail";
import { fetchRandomCard } from "~/utils/card-search";
import { RIOT_NOTICE } from "~/utils/riot-notice";

const route = useRoute();
const theme = useTheme();
const { apiBase } = useRuntimeConfig().public;
const { links: navLinks, query: navQuery, navigate, search } = useSiteNavigation("/random");
const query = computed(() => (typeof route.query.q === "string" ? route.query.q : ""));
const { data: outcome, status, refresh } = useLazyAsyncData(
  () => `random:${query.value}`,
  () => fetchRandomCard(apiBase, query.value),
);

watchEffect(() => {
  if (status.value === "success" && outcome.value?.kind === "card") {
    navigateTo(cardHref(outcome.value.card.id), { replace: true });
  }
});

const title = computed(() =>
  status.value === "pending" || !outcome.value || outcome.value.kind === "card"
    ? "Choosing a random card"
    : outcome.value.kind === "not-found"
      ? "No matching cards"
      : "Could not choose a card",
);
useHead(() => ({ title: `${title.value} · Riftkeeper` }));
</script>

<template>
  <AppShell :title="title">
    <template #header>
      <SiteNavbar v-model="navQuery" v-model:theme="theme" :links="navLinks" @search="search" @navigate="navigate" />
    </template>
    <BackLink variant="button" href="/" label="Back to search" @navigate="navigate" />
    <StatusMessage v-if="status === 'pending' || !outcome || outcome.kind === 'card'" kind="loading" :title="title" />
    <StatusMessage
      v-else-if="outcome.kind === 'not-found'"
      kind="empty"
      :title="title"
      :detail="query ? `No cards match “${query}”.` : 'There are no cards to choose from.'"
    />
    <StatusMessage v-else kind="error" :title="title" :detail="outcome.message" action="Try again" @action="refresh" />
    <template #footer>
      <SiteFooter :notice="RIOT_NOTICE" />
    </template>
  </AppShell>
</template>
