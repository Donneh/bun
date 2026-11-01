<script setup lang="ts">
import {
  AppShell,
  CardGrid,
  CollectionOverview,
  CollectionTransfer,
  type ImportMode,
  PageSection,
  SiteFooter,
  SiteNavbar,
  StatusMessage,
} from "@riftkeeper/ui";
import { useCollection } from "~/composables/collection";
import { useTheme } from "~/composables/theme";
import { fetchCatalogue } from "~/utils/catalogue";
import {
  type Collection,
  collectionFile,
  collectionFileName,
  collectionTotals,
  importedCollection,
  parseCollectionFile,
} from "~/utils/collection";
import { collectionView, importPreview } from "~/utils/collection-view";
import { downloadJson } from "~/utils/download";
import { RIOT_NOTICE } from "~/utils/riot-notice";

type ImportState =
  | { readonly kind: "idle" }
  | { readonly kind: "previewing"; readonly fileName: string; readonly incoming: Collection }
  | { readonly kind: "rejected"; readonly message: string }
  | { readonly kind: "done"; readonly message: string };

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PLACEHOLDERS = 12;

const theme = useTheme();
const { links: navLinks, query: navQuery, navigate, search } = useSiteNavigation("/collection");
const { apiBase } = useRuntimeConfig().public;
const collection = useCollection();

const current = computed(() => collection.collection.value);
const entryCount = computed(() => Object.keys(current.value.printings).length);
const totals = computed(() => collectionTotals(current.value));

const {
  data: catalogue,
  status,
  execute,
  refresh,
} = useLazyAsyncData("catalogue", () => fetchCatalogue(apiBase), { immediate: false });

watch(
  entryCount,
  (count) => {
    if (count > 0 && status.value === "idle") void execute();
  },
  { immediate: true },
);

const view = computed(() =>
  catalogue.value?.kind === "catalogue" ? collectionView(current.value, catalogue.value.cards) : null,
);

const importState = ref<ImportState>({ kind: "idle" });
const preview = computed(() =>
  importState.value.kind === "previewing"
    ? importPreview(importState.value.fileName, current.value, importState.value.incoming)
    : null,
);

useHead({ title: "Collection · Riftkeeper" });

function exportCollection() {
  const now = new Date();
  downloadJson(collectionFileName(now), collectionFile(current.value, now));
}

async function chooseFile(file: File) {
  if (file.size > MAX_FILE_BYTES) {
    importState.value = { kind: "rejected", message: "This file is too large to be a Riftkeeper collection export." };
    return;
  }
  const parsed = parseCollectionFile(await file.text());
  importState.value =
    parsed.kind === "collection"
      ? { kind: "previewing", fileName: file.name, incoming: parsed.collection }
      : { kind: "rejected", message: parsed.message };
}

function applyImport(mode: ImportMode) {
  if (importState.value.kind !== "previewing") return;
  const { fileName, incoming } = importState.value;
  collection.replace(importedCollection(current.value, incoming, mode));
  importState.value = {
    kind: "done",
    message: mode === "merge" ? `Merged ${fileName} into the collection.` : `Replaced the collection with ${fileName}.`,
  };
}

function cancelImport() {
  importState.value = { kind: "idle" };
}
</script>

<template>
  <AppShell>
    <template #header>
      <SiteNavbar
        v-model="navQuery"
        v-model:theme="theme"
        :links="navLinks"
        @search="search"
        @navigate="navigate"
      />
    </template>
    <CollectionOverview
      :totals="totals"
      :saved="collection.saved.value"
      :value="view?.value ?? null"
      :unknown="view?.unknown ?? 0"
    />
    <CollectionTransfer
      :preview="preview"
      :error="importState.kind === 'rejected' ? importState.message : null"
      :notice="importState.kind === 'done' ? importState.message : null"
      :exportable="entryCount > 0"
      @export="exportCollection"
      @choose="chooseFile"
      @apply="applyImport"
      @cancel="cancelImport"
    />
    <StatusMessage
      v-if="entryCount === 0"
      kind="empty"
      title="Your collection is empty"
      detail="Open a card and press + for each copy you own, or import an exported file."
    />
    <StatusMessage
      v-else-if="catalogue?.kind === 'error'"
      kind="error"
      title="Could not load the card list"
      :detail="catalogue.message"
      action="Try again"
      @action="refresh"
    />
    <PageSection v-else-if="!view" title="Owned">
      <CardGrid :cards="[]" :placeholders="Math.min(entryCount, MAX_PLACEHOLDERS)" label="Loading collection" />
    </PageSection>
    <template v-else>
      <PageSection title="Owned">
        <CardGrid v-if="view.owned.length > 0" :cards="view.owned" label="Owned printings" @navigate="navigate" />
        <StatusMessage v-else kind="empty" title="No copies yet" detail="Press + on a card page to add one." />
      </PageSection>
      <PageSection title="Wishlist">
        <CardGrid v-if="view.wishlist.length > 0" :cards="view.wishlist" label="Wishlist" @navigate="navigate" />
        <StatusMessage
          v-else
          kind="empty"
          title="The wishlist is empty"
          detail="Press Wishlist on a card page to add a printing."
        />
      </PageSection>
    </template>
    <template #footer>
      <SiteFooter :notice="RIOT_NOTICE" />
    </template>
  </AppShell>
</template>
