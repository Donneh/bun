import { describe, expect, test } from "bun:test";
import { readCardSnapshot } from "./snapshot-file.ts";

describe("card snapshot", () => {
  test("names the file that does not exist", async () => {
    await expect(readCardSnapshot(Bun.fileURLToPath(new URL("cards.json.missing", import.meta.url)))).rejects.toThrow(
      "cards.json.missing does not exist",
    );
  });
});
