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
    state.value = { collection: next, saved: saveCollection(browserStorage, next) };
  }

  function reload() {
    const stored = loadCollection(browserStorage);
    if (stored.saved) state.value = stored;
  }

  return {
    collection: computed(() => state.value.collection),
    saved: computed(() => state.value.saved),
    setOwned: (code: string, owned: number) => update(setOwned(state.value.collection, code, owned)),
    setWishlisted: (code: string, wishlist: boolean) => update(setWishlisted(state.value.collection, code, wishlist)),
    replace: update,
    reload,
  };
}
