<script setup lang="ts">
import {
  AppShell,
  CardGrid,
  ExampleQueries,
  FilterChips,
  Hero,
  InfiniteScrollSentinel,
  ResultSummary,
  SearchBar,
  SortControl,
  type SortSelection,
  StatusMessage,
  ThemeButton,
  Toolbar,
  WarningList,
} from "@riftkeeper/ui";
import { useTheme } from "~/composables/theme";
import { appendPage, fetchCardCount, type SearchView, searchCards } from "~/utils/card-search";
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

type NextPageState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string };

const LOADING_PLACEHOLDERS = 12;
const NEXT_PAGE_PLACEHOLDERS = 8;
const MIN_PAGE_INTERVAL_MS = 600;
const EXAMPLE_QUERIES = ["c:fury cost:<=2", "r:epic might:>=5", "ability:draw"];

const route = useRoute();
const { apiBase } = useRuntimeConfig().public;

definePageMeta({ keepalive: true });

const theme = useTheme();

const { data: cardCount } = useLazyAsyncData("card-count", () => fetchCardCount(apiBase));
const eyebrow = computed(() =>
  ["Riftkeeper", cardCount.value ? `${cardCount.value.toLocaleString("en")} cards` : null, "updated nightly"]
    .filter(Boolean)
    .join(" · "),
);

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

const nextPage = ref<NextPageState>({ kind: "idle" });
const nearEnd = ref(false);
let nextPageAllowedAt = 0;
let nextPageTimer: ReturnType<typeof setTimeout> | undefined;

watch(stateKey, () => {
  clearTimeout(nextPageTimer);
  nextPage.value = { kind: "idle" };
});

const view = computed<SearchView>(() => {
  if (!state.value.query) return { kind: "idle" };
  if (status.value === "pending" || !outcome.value) return { kind: "loading" };
  return outcome.value;
});

const nextPagePlaceholders = computed(() =>
  view.value.kind === "results" && nextPage.value.kind === "loading"
    ? Math.min(NEXT_PAGE_PLACEHOLDERS, view.value.total - view.value.cards.length)
    : 0,
);

watch([nearEnd, nextPage, view], continueScrolling);
onBeforeUnmount(() => clearTimeout(nextPageTimer));

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

function continueScrolling() {
  clearTimeout(nextPageTimer);
  if (!nearEnd.value || nextPage.value.kind !== "idle") return;
  const wait = nextPageAllowedAt - Date.now();
  if (wait > 0) {
    nextPageTimer = setTimeout(continueScrolling, wait);
    return;
  }
  void loadNextPage();
}

async function loadNextPage() {
  const current = view.value;
  if (current.kind !== "results" || !current.hasMore || nextPage.value.kind === "loading") return;
  const requestedFor = stateKey.value;
  nextPage.value = { kind: "loading" };
  nextPageAllowedAt = Date.now() + MIN_PAGE_INTERVAL_MS;
  const next = await searchCards(apiBase, state.value, current.page + 1);
  if (requestedFor !== stateKey.value) return;
  if (next.kind === "error") {
    nextPage.value = { kind: "error", message: next.message };
    return;
  }
  outcome.value = appendPage(current, next);
  nextPage.value = { kind: "idle" };
}
</script>

<template>
  <AppShell>
    <Hero
      :eyebrow="eyebrow"
      title="Search the whole set. Instantly."
      subtitle="Find cards by name, domain, cost, rarity or card text."
    >
      <template #actions>
        <ThemeButton v-model="theme" />
      </template>
    </Hero>
    <SearchBar v-model="draft" placeholder="c:fury cost:<=2" @submit="submit" />
    <FilterChips
      v-if="view.kind === 'results'"
      :chips="chips"
      :more-conditions="view.parsed.hasAdvancedConditions"
      @remove="removeFilter"
    />
    <WarningList v-if="view.kind === 'results'" :warnings="view.warnings" />
    <StatusMessage v-if="view.kind === 'idle'" kind="empty" title="Try a query">
      <ExampleQueries :queries="EXAMPLE_QUERIES" @select="submit" />
    </StatusMessage>
    <template v-else-if="view.kind === 'loading'">
      <StatusMessage kind="loading" title="Searching…" />
      <CardGrid :cards="[]" :placeholders="LOADING_PLACEHOLDERS" label="Loading results" />
    </template>
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
      <CardGrid
        :cards="view.cards"
        :placeholders="nextPagePlaceholders"
        label="Search results"
        @navigate="navigateTo"
      />
      <StatusMessage
        v-if="nextPage.kind === 'error'"
        kind="error"
        title="Could not load more cards"
        :detail="nextPage.message"
        action="Try again"
        @action="loadNextPage"
      />
      <InfiniteScrollSentinel v-else-if="view.hasMore" :key="stateKey" @change="nearEnd = $event" />
    </template>
  </AppShell>
</template>
