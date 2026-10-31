<script setup lang="ts">
import {
  AppShell,
  BackLink,
  CardDetail,
  CardDetailSkeleton,
  CardImage,
  CardInfo,
  DomainBackdrop,
  domainScope,
  SiteFooter,
  SiteNavbar,
  StatusMessage,
} from "@riftkeeper/ui";
import { useTheme } from "~/composables/theme";
import { rememberedCard } from "~/utils/card-cache";
import { cardInfo, printingSummaries, selectedPrinting } from "~/utils/card-detail";
import { responsiveImage } from "~/utils/card-images";
import { type CardView, fetchCard } from "~/utils/card-search";
import { RIOT_NOTICE } from "~/utils/riot-notice";

const route = useRoute();
const router = useRouter();
const { apiBase } = useRuntimeConfig().public;
const theme = useTheme();

const NAV_LINKS = [{ label: "Cards", href: "/", current: true }];

const cardId = computed(() => String(route.params.id));

const {
  data: outcome,
  status,
  refresh,
} = useLazyAsyncData(
  () => `card:${cardId.value}`,
  () => {
    const card = rememberedCard(cardId.value);
    return card ? Promise.resolve({ kind: "card", card } as const) : fetchCard(apiBase, cardId.value);
  },
);

const view = computed<CardView>(() => {
  if (outcome.value && status.value !== "pending") return outcome.value;
  const remembered = rememberedCard(cardId.value);
  return remembered ? { kind: "card", card: remembered } : { kind: "loading" };
});
const card = computed(() => (view.value.kind === "card" ? view.value.card : null));
const domains = computed(() => card.value?.domains ?? []);
const printing = computed(() => (card.value ? selectedPrinting(card.value, route.query.printing) : null));
const info = computed(() => (card.value && printing.value ? cardInfo(card.value, printing.value) : null));
const printings = computed(() => (card.value ? printingSummaries(card.value) : []));
const image = computed(() =>
  printing.value ? responsiveImage(printing.value.imageUrl, printing.value.orientation, "detail") : null,
);

const STATUS_HEADINGS: Record<Exclude<CardView["kind"], "card">, string> = {
  loading: "Loading card",
  "not-found": "Card not found",
  error: "Could not load the card",
};
const statusHeading = computed(() => (view.value.kind === "card" ? undefined : STATUS_HEADINGS[view.value.kind]));

const resultsPath = ref<string | null>(null);
onMounted(() => {
  const back = router.options.history.state.back;
  if (typeof back === "string" && router.resolve(back).name === "index") resultsPath.value = back;
});

const navQuery = ref("");

useHead(() => ({
  title: card.value
    ? `${card.value.name} · Riftkeeper`
    : view.value.kind === "not-found"
      ? "Card not found · Riftkeeper"
      : "Riftkeeper",
}));

async function goBack(href: string) {
  if (resultsPath.value) router.back();
  else await navigateTo(href);
}

function navigate(href: string) {
  return navigateTo(href);
}

function search(query: string) {
  return navigateTo({ path: "/", query: query ? { q: query } : {} });
}

function choosePrinting(id: string) {
  return navigateTo({ query: { ...route.query, printing: id } }, { replace: true });
}
</script>

<template>
  <AppShell narrow :title="statusHeading" v-bind="domainScope(domains)">
    <template #backdrop>
      <DomainBackdrop :domains="domains" />
    </template>
    <template #header>
      <SiteNavbar
        v-model="navQuery"
        v-model:theme="theme"
        :links="NAV_LINKS"
        @search="search"
        @navigate="navigate"
      />
    </template>
    <BackLink
      variant="button"
      :href="resultsPath ?? '/'"
      :label="resultsPath ? 'Back to results' : 'Back to search'"
      @navigate="goBack"
    />
    <CardDetailSkeleton v-if="view.kind === 'loading'" />
    <StatusMessage
      v-else-if="view.kind === 'not-found'"
      kind="empty"
      title="Card not found"
      :detail="`No card has the id “${cardId}”.`"
    />
    <StatusMessage
      v-else-if="view.kind === 'error'"
      kind="error"
      title="Could not load the card"
      :detail="view.message"
      action="Try again"
      @action="refresh"
    />
    <CardDetail v-else-if="card && printing && image && info" :orientation="printing.orientation">
      <template #art>
        <CardImage
          :name="card.name"
          :image-url="printing.imageUrl"
          :orientation="printing.orientation"
          :srcset="image.srcset"
          :sizes="image.sizes"
          loading="eager"
        />
      </template>
      <CardInfo
        :card="info"
        :printings="printings"
        :selected="printing.id"
        @select="choosePrinting"
        @navigate="navigate"
      />
    </CardDetail>
    <template #footer>
      <SiteFooter :notice="RIOT_NOTICE" />
    </template>
  </AppShell>
</template>
