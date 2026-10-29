import { describe, expect, test } from "bun:test";
import type { Card } from "@riftkeeper/cards";
import { galleryHtml, loadFixtureItems } from "../test-support/fixtures.ts";
import { type PreviousSnapshot, runScrape } from "./run-scrape.ts";

async function fixtureHtml(): Promise<string> {
  return galleryHtml({ items: await loadFixtureItems() });
}

const current = (cards: readonly Card[]): PreviousSnapshot => ({ kind: "current", cards });

async function scrapedCards(): Promise<Card[]> {
  const outcome = runScrape({ html: await fixtureHtml(), previous: current([]) });
  if (outcome.kind === "rejected") throw new Error(outcome.message);
  return outcome.cards;
}

describe("runScrape", () => {
  test("treats the first run as every card added", async () => {
    const outcome = runScrape({ html: await fixtureHtml(), previous: current([]) });

    if (outcome.kind !== "changed") throw new Error(`expected changed, got ${outcome.kind}`);
    expect(outcome.cards.length).toBeGreaterThan(0);
    expect(outcome.report).toContain(`${outcome.cards.length} cards added`);
    expect(outcome.report).toContain("### Scrape warnings");
    expect(outcome.pullRequestBody).toBe(outcome.report);
  });

  test("reports unchanged when the scrape matches the snapshot", async () => {
    const previous = await scrapedCards();

    const outcome = runScrape({ html: await fixtureHtml(), previous: current(previous) });

    expect(outcome).toMatchObject({ kind: "unchanged" });
    expect(outcome.kind === "unchanged" && outcome.cards).toEqual(previous);
  });

  test("reports what changed against the snapshot", async () => {
    const [first, ...rest] = await scrapedCards();
    if (!first) throw new Error("fixture produced no cards");
    const previous = [{ ...first, name: "Renamed Before" }, ...rest];

    const outcome = runScrape({ html: await fixtureHtml(), previous: current(previous) });

    if (outcome.kind !== "changed") throw new Error(`expected changed, got ${outcome.kind}`);
    expect(outcome.report).toContain("1 changed");
    expect(outcome.report).toContain(first.name);
    expect(outcome.cards).toHaveLength(rest.length + 1);
  });

  test("rejects a scrape that loses too many printings", async () => {
    const previous = await scrapedCards();
    const items = (await loadFixtureItems()).slice(0, 1);

    const outcome = runScrape({ html: galleryHtml({ items }), previous: current(previous) });

    expect(outcome).toMatchObject({ kind: "rejected", reason: "too-many-printings-missing" });
  });

  describe("against a snapshot written for an older schema", () => {
    function outdated(cards: readonly Card[]): PreviousSnapshot {
      const json = cards.map(({ tags: _tags, printings, ...card }) => ({
        ...card,
        legacy: true,
        printings: printings.map(({ orientation: _orientation, ...printing }) => printing),
      }));
      return { kind: "outdated", json };
    }

    test("reports the schema change and no card changes", async () => {
      const outcome = runScrape({ html: await fixtureHtml(), previous: outdated(await scrapedCards()) });

      if (outcome.kind !== "changed") throw new Error(`expected changed, got ${outcome.kind}`);
      expect(outcome.report).toContain("Snapshot rebuilt for a schema change");
      expect(outcome.report).toContain("- Added fields: `tags`, `printings.orientation`");
      expect(outcome.report).toContain("- Removed fields: `legacy`");
      expect(outcome.report).toContain("No changes to the card snapshot.");
    });

    test("still reports real changes next to the schema change", async () => {
      const [first, ...rest] = await scrapedCards();
      if (!first) throw new Error("fixture produced no cards");

      const outcome = runScrape({
        html: await fixtureHtml(),
        previous: outdated([{ ...first, name: "Renamed Before" }, ...rest]),
      });

      if (outcome.kind !== "changed") throw new Error(`expected changed, got ${outcome.kind}`);
      expect(outcome.report).toContain("1 changed");
      expect(outcome.report).toContain(first.name);
    });

    test("is unchanged when the snapshot already matches the schema", async () => {
      const previous: PreviousSnapshot = { kind: "outdated", json: await scrapedCards() };

      expect(runScrape({ html: await fixtureHtml(), previous })).toMatchObject({ kind: "unchanged" });
    });

    test("names a removed card it cannot upgrade", async () => {
      const [first] = await scrapedCards();
      if (!first) throw new Error("fixture produced no cards");
      const { tags: _tags, ...withoutTags } = { ...first, id: "gone-card" };

      const html = await fixtureHtml();

      expect(() => runScrape({ html, previous: { kind: "outdated", json: [withoutTags] } })).toThrow(
        "Cannot upgrade previous card gone-card: tags",
      );
    });
  });
});
