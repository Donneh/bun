import { browserStorage } from "~/utils/browser-storage";
import {
  type Collection,
  loadCollection,
  type StoredCollection,
  saveCollection,
  setOwned,
  setWishlisted,
} from "~/utils/collection";

export function useCollection() {
  const state = useState<StoredCollection>("collection", () => loadCollection(browserStorage));

  function update(next: Collection) {
    const storage = saveCollection(browserStorage, next, state.value.storage, new Date());
    state.value = { collection: next, storage };
    return storage;
  }

  function reload() {
    const stored = loadCollection(browserStorage);
    if (stored.storage.kind !== "saved") return;
    const current = state.value.storage;
    state.value = current.kind === "recovered" ? { ...stored, storage: current } : stored;
  }

  return {
    collection: computed(() => state.value.collection),
    storage: computed(() => state.value.storage.kind),
    backupKey: computed(() => (state.value.storage.kind === "recovered" ? state.value.storage.backupKey : null)),
    setOwned: (code: string, owned: number) => update(setOwned(state.value.collection, code, owned)),
    setWishlisted: (code: string, wishlist: boolean) => update(setWishlisted(state.value.collection, code, wishlist)),
    replace: update,
    reload,
  };
}
