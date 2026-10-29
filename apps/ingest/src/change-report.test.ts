import { describe, expect, test } from "bun:test";
import { makeCard, makePrinting } from "@riftkeeper/cards/testing";
import { changeReportBlocks } from "./change-report.ts";
import { diffCards } from "./diff-cards.ts";
import { COLLAPSE_THRESHOLD, MAX_COLLAPSED_BLOCK_LENGTH, renderBlocks } from "./markdown.ts";

const renderChangeReport = (changeSet: Parameters<typeof changeReportBlocks>[0]) =>
  renderBlocks(changeReportBlocks(changeSet));

const longAbility =
  "When you play this, draw a card.\nThen, if you control another unit, give it +1 might this turn and ready it.";
const revisedAbility =
  "When you play this, draw 2 cards.\nThen, if you control another unit, give it +2 might this turn and ready it.";

describe("renderChangeReport", () => {
  test("says so when nothing changed", () => {
    const card = makeCard();

    const report = renderChangeReport(diffCards({ previous: [card], next: [card] }));

    expect(report).toContain("No changes");
    expect(report).not.toContain("###");
  });

  test("summarises card and printing counts", () => {
    const ahri = makeCard({ id: "ahri", name: "Ahri" });
    const extra = makePrinting({ id: "ahri-p2", publicCode: "OGN-002b/298" });

    const report = renderChangeReport(
      diffCards({
        previous: [ahri, makeCard({ id: "gone" })],
        next: [{ ...ahri, printings: [...ahri.printings, extra] }, makeCard({ id: "fresh" })],
      }),
    );

    expect(report).toContain("1 card added, 1 removed, 1 changed");
    expect(report).toContain("Printings: 2 added, 1 removed, 0 changed");
  });

  test("lists added cards under their set with identifying details", () => {
    const origins = makeCard({
      id: "ahri-inquisitive",
      name: "Ahri",
      subtitle: "Inquisitive",
      energyCost: 3,
      printings: [makePrinting({ id: "ogn-066a-298", publicCode: "OGN-066a/298" })],
    });
    const spirit = makeCard({
      id: "kai-sa",
      name: "Kai'Sa",
      printings: [
        makePrinting({
          id: "sfd-001-001",
          publicCode: "SFD-001/221",
          set: { code: "SFD", name: "Spiritforged" },
        }),
      ],
    });

    const report = renderChangeReport(diffCards({ previous: [], next: [spirit, origins] }));

    expect(report).toContain("### Added cards (2)");
    expect(report.indexOf("OGN: Origins")).toBeLessThan(report.indexOf("SFD: Spiritforged"));
    expect(report).toContain("Ahri - Inquisitive");
    expect(report).toContain("`ahri-inquisitive`");
    expect(report).toContain("energy 3");
    expect(report).toContain("OGN-066a/298");
  });

  test("renders short field changes inline as old to new", () => {
    const card = makeCard({ id: "ahri", name: "Ahri", energyCost: 2, type: null });

    const report = renderChangeReport(
      diffCards({ previous: [card], next: [{ ...card, energyCost: 4, type: "unit" }] }),
    );

    expect(report).toContain("### Changed cards (1)");
    expect(report).toContain("#### Ahri (`ahri`)");
    expect(report).toContain("- **energyCost**: `2` → `4`");
    expect(report).toContain("- **type**: `null` → `unit`");
  });

  test("renders long text changes as a before and after block", () => {
    const before = makeCard({ id: "ahri", ability: longAbility });

    const report = renderChangeReport(
      diffCards({ previous: [before], next: [{ ...before, ability: revisedAbility }] }),
    );

    expect(report).toContain("- **ability**");
    expect(report).toContain("```diff");
    expect(report).toContain("- When you play this, draw a card.");
    expect(report).toContain("+ When you play this, draw 2 cards.");
  });

  test("describes printing additions, removals and changes with their public codes", () => {
    const kept = makePrinting({ id: "ahri-p1", publicCode: "OGN-001a/298" });
    const dropped = makePrinting({ id: "ahri-p2", publicCode: "OGN-001b/298" });
    const ahri = makeCard({ id: "ahri", name: "Ahri", printings: [kept, dropped] });
    const added = makePrinting({ id: "ahri-p3", publicCode: "OGN-001c/298" });
    const reArted = makePrinting({ ...kept, imageUrl: "https://cdn.example.com/new/path.png" });

    const report = renderChangeReport(
      diffCards({ previous: [ahri], next: [{ ...ahri, printings: [reArted, added] }] }),
    );

    expect(report).toContain("Printing added: **OGN-001c/298**");
    expect(report).toContain("Printing removed: **OGN-001b/298**");
    expect(report).toContain("Printing **OGN-001a/298** (`ahri-p1`) changed");
    expect(report).toContain("https://cdn.example.com/new/path.png");
  });

  test("collapses long lists and leaves short ones open", () => {
    const many = Array.from({ length: COLLAPSE_THRESHOLD + 1 }, (_, index) => makeCard({ id: `card-${index}` }));

    const collapsed = renderChangeReport(diffCards({ previous: [], next: many }));
    const open = renderChangeReport(diffCards({ previous: [], next: many.slice(0, COLLAPSE_THRESHOLD) }));

    expect(collapsed).toContain("<details>");
    expect(collapsed).toContain("</details>");
    expect(open).not.toContain("<details>");
  });

  test("renders identically for shuffled inputs", () => {
    const cards = ["delta", "alpha", "charlie"].map((id) => makeCard({ id }));

    const forward = renderChangeReport(diffCards({ previous: [], next: cards }));
    const reversed = renderChangeReport(diffCards({ previous: [], next: [...cards].reverse() }));

    expect(reversed).toBe(forward);
  });
});

describe("changeReportBlocks", () => {
  test("omits the artist when a printing has none", () => {
    const card = makeCard({ id: "ahri" });
    const credited = makePrinting({ id: "ahri-p2", publicCode: "OGN-001b/298", artist: "Jane Doe" });
    const uncredited = makePrinting({ id: "ahri-p3", publicCode: "OGN-001c/298", artist: null });

    const report = renderChangeReport(
      diffCards({ previous: [card], next: [{ ...card, printings: [...card.printings, credited, uncredited] }] }),
    );

    expect(report).toContain("OGN-001b/298** (`ahri-p2`), standard, common, art by Jane Doe");
    expect(report).not.toContain("null");
  });

  test("splits a long collapsed list into self-contained details blocks", () => {
    const text = "x".repeat(1_000);
    const before = Array.from({ length: 40 }, (_, index) => makeCard({ id: `card-${index}` }));
    const after = before.map((card) => ({ ...card, ability: text }));

    const blocks = changeReportBlocks(diffCards({ previous: before, next: after }));

    const details = blocks.filter((block) => block.includes("<details>"));
    expect(details.length).toBeGreaterThan(1);
    for (const block of details) {
      expect(block.length).toBeLessThanOrEqual(MAX_COLLAPSED_BLOCK_LENGTH + 500);
      expect(block.match(/<details>/g)).toHaveLength(1);
      expect(block.match(/<\/details>/g)).toHaveLength(1);
    }
    expect(blocks.join("\n")).toContain("Show cards 1-");
  });
});
