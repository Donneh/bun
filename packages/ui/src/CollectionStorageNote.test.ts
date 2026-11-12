import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CollectionStorageNote from "./CollectionStorageNote.vue";
import type { CollectionStorage } from "./collection.ts";

describe("CollectionStorageNote", () => {
  const messages: Record<CollectionStorage, RegExp> = {
    saved: /^Saved in this browser only\.$/,
    blocked: /blocks storage/,
    failed: /could not be saved/,
    unreadable: /could not be read.*copied to a backup before the next change/,
    protected: /could not be read.*changes are not saved/,
    recovered: /could not be read.*kept in this browser as a backup/,
  };

  for (const [state, message] of Object.entries(messages))
    test(`says what happens to the collection when storage is ${state}`, () => {
      render(CollectionStorageNote, { props: { state: state as CollectionStorage } });

      expect(screen.getByText(message)).toBeTruthy();
    });

  test("names the backup key once the unreadable original was copied", () => {
    render(CollectionStorageNote, {
      props: { state: "recovered", backupKey: "riftkeeper-collection-backup-2026-11-01T12:00:00.000Z" },
    });

    expect(screen.getByText(/under riftkeeper-collection-backup-2026-11-01T12:00:00\.000Z/)).toBeTruthy();
  });
});
