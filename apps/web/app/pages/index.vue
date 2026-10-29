<script setup lang="ts">
import { AppShell, CardGrid, ResultSummary, SearchBar, StatusMessage, WarningList } from "@riftkeeper/ui";
import { type SearchView, searchCards } from "~/utils/card-search";

const route = useRoute();
const { apiBase } = useRuntimeConfig().public;

const query = computed(() => (typeof route.query.q === "string" ? route.query.q.trim() : ""));
const draft = ref(query.value);
watch(query, (value) => {
  draft.value = value;
});

const {
  data: outcome,
  status,
  refresh,
} = await useAsyncData(
  () => `search:${query.value}`,
  () => (query.value ? searchCards(apiBase, query.value) : Promise.resolve(null)),
);

const view = computed<SearchView>(() => {
  if (!query.value) return { kind: "idle" };
  if (status.value === "pending" || !outcome.value) return { kind: "loading" };
  return outcome.value;
});

useHead(() => ({ title: query.value ? `${query.value} · Riftkeeper` : "Riftkeeper" }));

async function submit(value: string) {
  if (value === query.value) {
    await refresh();
    return;
  }
  await navigateTo({ query: value ? { q: value } : {} });
}
</script>

<template>
  <AppShell title="Riftkeeper">
    <SearchBar v-model="draft" placeholder="c:fury cost:<=2" @submit="submit" />
    <WarningList v-if="view.kind === 'results'" :warnings="view.warnings" />
    <StatusMessage
      v-if="view.kind === 'idle'"
      kind="empty"
      title="Search the Riftbound card list"
      detail="Try c:fury cost:<=2 or type:battlefield."
    />
    <StatusMessage v-else-if="view.kind === 'loading'" kind="loading" title="Searching…" />
    <StatusMessage v-else-if="view.kind === 'error'" kind="error" title="Search failed" :detail="view.message" />
    <StatusMessage
      v-else-if="view.cards.length === 0"
      kind="empty"
      title="No cards found"
      detail="Check the query for typos or remove a filter."
    />
    <template v-else>
      <ResultSummary :shown="view.cards.length" :total="view.total" />
      <CardGrid :cards="view.cards" label="Search results" />
    </template>
  </AppShell>
</template>
