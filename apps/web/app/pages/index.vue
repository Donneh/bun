<script setup lang="ts">
import {
  AppShell,
  CardGrid,
  FilterChips,
  LoadMoreButton,
  ResultSummary,
  SearchBar,
  SortControl,
  type SortSelection,
  StatusMessage,
  Toolbar,
  WarningList,
} from "@riftkeeper/ui";
import { appendPage, type SearchView, searchCards } from "~/utils/card-search";
import { chipId, removeSpan, toChipSummary } from "~/utils/filter-chips";
import {
  parseSearchState,
  parseSortDirection,
  parseSortKey,
  type SearchState,
  SORT_OPTIONS,
  searchStateKey,
  toRouteQuery,
} from "~/utils/search-state";

type LoadMoreState = { readonly kind: "idle" } | { readonly kind: "loading" } | { readonly kind: "error"; readonly message: string };

const route = useRoute();
const { apiBase } = useRuntimeConfig().public;

const state = computed(() => parseSearchState(route.query));
const stateKey = computed(() => searchStateKey(state.value));
const draft = ref(state.value.query);
watch(
  () => state.value.query,
  (value) => {
    draft.value = value;
  },
);

const {
  data: outcome,
  status,
  refresh,
} = await useAsyncData(
  () => `search:${stateKey.value}`,
  () => (state.value.query ? searchCards(apiBase, state.value) : Promise.resolve(null)),
);

const loadMore = ref<LoadMoreState>({ kind: "idle" });
watch(stateKey, () => {
  loadMore.value = { kind: "idle" };
});

const view = computed<SearchView>(() => {
  if (!state.value.query) return { kind: "idle" };
  if (status.value === "pending" || !outcome.value) return { kind: "loading" };
  return outcome.value;
});

const chips = computed(() => (view.value.kind === "results" ? view.value.parsed.filters.map(toChipSummary) : []));

useHead(() => ({ title: state.value.query ? `${state.value.query} · Riftkeeper` : "Riftkeeper" }));

async function search(next: SearchState) {
  if (searchStateKey(next) === stateKey.value) {
    await refresh();
    return;
  }
  await navigateTo({ query: toRouteQuery(next) });
}

function submit(query: string) {
  return search({ ...state.value, query });
}

function changeSort({ sort, direction }: SortSelection) {
  return search({ ...state.value, sort: parseSortKey(sort), direction: parseSortDirection(direction) });
}

function removeFilter(id: string) {
  if (view.value.kind !== "results") return;
  const { parsed } = view.value;
  const chip = parsed.filters.find((filter) => chipId(filter.span) === id);
  if (chip) return search({ ...state.value, query: removeSpan(parsed.query, chip.span) });
}

async function loadNextPage() {
  const current = outcome.value;
  if (current?.kind !== "results" || loadMore.value.kind === "loading") return;
  const requestedFor = stateKey.value;
  loadMore.value = { kind: "loading" };
  const next = await searchCards(apiBase, state.value, current.page + 1);
  if (requestedFor !== stateKey.value) return;
  if (next.kind === "error") {
    loadMore.value = { kind: "error", message: next.message };
    return;
  }
  outcome.value = appendPage(current, next);
  loadMore.value = { kind: "idle" };
}
</script>

<template>
  <AppShell title="Riftkeeper">
    <SearchBar v-model="draft" placeholder="c:fury cost:<=2" @submit="submit" />
    <FilterChips
      v-if="view.kind === 'results'"
      :chips="chips"
      :more-conditions="view.parsed.hasAdvancedConditions"
      @remove="removeFilter"
    />
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
      <Toolbar>
        <ResultSummary :shown="view.cards.length" :total="view.total" />
        <SortControl
          :sort="state.sort"
          :direction="state.direction"
          :options="SORT_OPTIONS"
          @change="changeSort"
        />
      </Toolbar>
      <CardGrid :cards="view.cards" label="Search results" />
      <StatusMessage
        v-if="loadMore.kind === 'error'"
        kind="error"
        title="Could not load more cards"
        :detail="loadMore.message"
      />
      <LoadMoreButton
        v-if="view.hasMore"
        :loading="loadMore.kind === 'loading'"
        @load="loadNextPage"
      />
    </template>
  </AppShell>
</template>
