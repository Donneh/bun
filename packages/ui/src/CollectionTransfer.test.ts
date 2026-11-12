import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CollectionTransfer from "./CollectionTransfer.vue";
import type { ImportPreview } from "./collection.ts";

const preview: ImportPreview = {
  fileName: "backup.json",
  printings: 3,
  options: [
    { mode: "merge", added: 1, changed: 2, removed: 0, copies: 9, wishlist: 1 },
    { mode: "replace", added: 1, changed: 2, removed: 4, copies: 5, wishlist: 0 },
  ],
};

describe("CollectionTransfer", () => {
  test("reports an export", async () => {
    const { emitted } = render(CollectionTransfer);

    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(emitted("export")).toHaveLength(1);
  });

  test("cannot export an empty collection", () => {
    render(CollectionTransfer, { props: { exportable: false } });

    expect(screen.getByRole("button", { name: "Export" }).hasAttribute("disabled")).toBe(true);
  });

  test("reports the file a reader chooses to import", async () => {
    const { emitted } = render(CollectionTransfer);
    const file = new File(["{}"], "backup.json", { type: "application/json" });

    await userEvent.upload(screen.getByLabelText("Import"), file);

    expect(emitted("choose")).toEqual([[file]]);
  });

  test("previews merging and replacing and reports the choice", async () => {
    const { emitted } = render(CollectionTransfer, { props: { preview } });

    const region = screen.getByRole("region", { name: "Import backup.json (3 printings)" });
    const [merge, replace] = within(region).getAllByRole("listitem");
    expect(merge?.textContent).toContain("1 added · 2 changed · 0 removed");
    expect(merge?.textContent).toContain("Afterwards: 9 copies, 1 printing on the wishlist");
    expect(replace?.textContent).toContain("1 added · 2 changed · 4 removed");

    await userEvent.click(within(region).getByRole("button", { name: "Replace" }));
    await userEvent.click(within(region).getByRole("button", { name: "Cancel import" }));

    expect(emitted("apply")).toEqual([["replace"]]);
    expect(emitted("cancel")).toHaveLength(1);
  });

  test("shows a rejected file as an alert and a finished import as a status", async () => {
    const { rerender } = render(CollectionTransfer, {
      props: { error: "This file is not a Riftkeeper collection export." },
    });
    expect(screen.getByRole("alert").textContent).toBe("This file is not a Riftkeeper collection export.");

    await rerender({ error: null, notice: "Merged backup.json into the collection." });
    expect(screen.getByRole("status").textContent).toBe("Merged backup.json into the collection.");
  });
});
