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
import { rememberedCard } from "~/utils/card-cache";
import { selectedPrinting } from "~/utils/card-detail";
import { responsiveImage } from "~/utils/card-images";
import { appendPage, fetchCardCount, searchCards } from "~/utils/card-search";
import { chipId, removeSpan, toChipSummary } from "~/utils/filter-chips";
import { preloadImage } from "~/utils/preload-image";
import {
  parseSearchState,
  parseSortDirection,
  parseSortKey,
  type SearchState,
  SORT_OPTIONS,
  searchStateKey,
  toRouteQuery,
} from "~/utils/search-state";
import { type SearchResults, type SearchView, searchView } from "~/utils/search-view";

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
  () => searchCards(apiBase, state.value),
);

const nextPage = ref<NextPageState>({ kind: "idle" });
const nearEnd = ref(false);
let nextPageAllowedAt = 0;
let nextPageTimer: ReturnType<typeof setTimeout> | undefined;

watch(stateKey, () => {
  clearTimeout(nextPageTimer);
  nextPage.value = { kind: "idle" };
});

const kept = ref<SearchResults | null>(null);
watch(
  outcome,
  (value) => {
    if (value) kept.value = value.kind === "results" ? value : null;
  },
  { immediate: true },
);

const view = computed<SearchView>(() => {
  const settled = status.value === "pending" ? null : (outcome.value ?? null);
  return searchView(settled, kept.value);
});

const current = computed(() => (view.value.kind === "results" && !view.value.stale ? view.value : null));

const nextPagePlaceholders = computed(() =>
  current.value && nextPage.value.kind === "loading"
    ? Math.min(NEXT_PAGE_PLACEHOLDERS, current.value.total - current.value.cards.length)
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

function preloadCardDetail(id: string) {
  const card = rememberedCard(id);
  if (!card) return;
  const { imageUrl, orientation } = selectedPrinting(card, undefined);
  preloadImage({ src: imageUrl, ...responsiveImage(imageUrl, orientation, "detail") });
}

function submit(query: string) {
  return search({ ...state.value, query });
}

function changeSort({ sort, direction }: SortSelection) {
  return search({ ...state.value, sort: parseSortKey(sort), direction: parseSortDirection(direction) });
}

function removeFilter(id: string) {
  if (!current.value) return;
  const { parsed } = current.value;
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
  const shown = current.value;
  if (!shown?.hasMore || nextPage.value.kind === "loading") return;
  const requestedFor = stateKey.value;
  nextPage.value = { kind: "loading" };
  nextPageAllowedAt = Date.now() + MIN_PAGE_INTERVAL_MS;
  const next = await searchCards(apiBase, state.value, shown.page + 1);
  if (requestedFor !== stateKey.value) return;
  if (next.kind === "error") {
    nextPage.value = { kind: "error", message: next.message };
    return;
  }
  outcome.value = appendPage(shown, next);
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
    <ExampleQueries v-if="!state.query" :queries="EXAMPLE_QUERIES" @select="submit" />
    <StatusMessage v-if="view.kind === 'error'" kind="error" title="Search failed" :detail="view.message" />
    <template v-else-if="view.kind === 'loading'">
      <FilterChips :chips="[]" :placeholder="Boolean(state.query)" />
      <Toolbar>
        <ResultSummary searching />
        <SortControl :sort="state.sort" :direction="state.direction" :options="SORT_OPTIONS" @change="changeSort" />
      </Toolbar>
      <CardGrid :cards="[]" :placeholders="LOADING_PLACEHOLDERS" label="Loading results" />
    </template>
    <template v-else>
      <FilterChips :chips="chips" :more-conditions="view.parsed.hasAdvancedConditions" @remove="removeFilter" />
      <WarningList :warnings="view.warnings" />
      <Toolbar>
        <ResultSummary :shown="view.cards.length" :total="view.total" :searching="view.stale" />
        <SortControl :sort="state.sort" :direction="state.direction" :options="SORT_OPTIONS" @change="changeSort" />
      </Toolbar>
      <StatusMessage
        v-if="view.cards.length === 0 && !view.stale"
        kind="empty"
        title="No cards found"
        detail="Check the query for typos or remove a filter."
      />
      <CardGrid
        v-else
        :cards="view.cards"
        :placeholders="view.stale ? 0 : nextPagePlaceholders"
        :stale="view.stale"
        label="Search results"
        @navigate="navigateTo"
        @intent="preloadCardDetail"
      />
      <template v-if="current">
        <StatusMessage
          v-if="nextPage.kind === 'error'"
          kind="error"
          title="Could not load more cards"
          :detail="nextPage.message"
          action="Try again"
          @action="loadNextPage"
        />
        <InfiniteScrollSentinel v-else-if="current.hasMore" :key="stateKey" @change="nearEnd = $event" />
      </template>
    </template>
  </AppShell>
</template>
