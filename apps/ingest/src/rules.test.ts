import { describe, expect, test } from "bun:test";
import type { RulesSnapshot } from "@riftkeeper/cards/rules";
import { makeCard } from "@riftkeeper/cards/testing";
import { buildRules, type RulesOverrides } from "./build-rules.ts";
import { type Article, readArticle, readArticleLinks, readBlocks } from "./riot-article.ts";
import { parseErrata, parseFaq } from "./rules-articles.ts";
import { rulesUpdate } from "./rules-update.ts";

const overrides: RulesOverrides = { aliases: {}, domainRunes: {}, excludedSources: {}, faqCards: {} };
const cards = [
  makeCard({ id: "called-shot", name: "Called Shot", type: "spell", domains: ["chaos"] }),
  makeCard({
    id: "wuju-bladesman-starter",
    name: "Wuju Bladesman",
    subtitle: "Starter",
    type: "legend",
    tags: ["Master Yi"],
  }),
  makeCard({ id: "the-dreaming-tree", name: "The Dreaming Tree", type: "battlefield" }),
] as const;
function article(title: string, body: string, publishedAt = "2026-03-30"): Article {
  return {
    title,
    url: `https://playriftbound.com/en-us/${encodeURIComponent(title)}`,
    publishedAt,
    category: "announcements",
    blocks: readBlocks(body),
  };
}
const hub = article(
  "Rules Hub",
  `
  <h3>Constructed Format Legality</h3><p>Last updated: July 24, 2026</p>
  <h4>Cards</h4><ul><li>Called Shot</li></ul><h4>Battlefields</h4><ul><li>Dreaming Tree</li></ul>
  <h3>2v2 Constructed Legality</h3><p>Last updated: July 24, 2026</p>
  <h3>Legends</h3><ul><li>Master Yi, Wuju Bladesman</li></ul><h3>Cards</h3><ul><li>Called Shot</li></ul>
  <h3>Battlefields</h3><ul><li>The Dreaming Tree</li></ul><h3>Core Rules</h3><ul><li>Ignore this link</li></ul>
`,
);
const first = article(
  "First Bans",
  `<p><strong>Effective</strong>: March 31, 2026<br></p>
  <p>The following are banned from Riftbound Standard Constructed:</p><p><strong>Cards</strong></p>
  <ul><li><p>Called Shot</p></li></ul><p><strong>Battlefields</strong></p><ul><li>Dreaming Tree</li></ul>
  <img src="x"><p>Reasoning.</p>`,
);
const july = article(
  "July Ban List Updates",
  `<p>Effective: July 24, 2026</p><h3>2v2 Constructed</h3>
  <p>We are introducing a 2v2 ban list, comprised of the entirety Standard ban list plus the following.</p>
  <h4>Legend</h4><ul><li>Master Yi, Wuju Bladesman</li></ul>`,
  "2026-07-17",
);

describe("rules ingest", () => {
  test("resolves Riot names and dates, including the creation of 2v2 without backdating its bans", () => {
    const { snapshot, warnings } = buildRules({ cards, hub, articles: [july, first], overrides });
    expect(warnings).toEqual([]);
    expect(snapshot.bans.map(({ card, format, effective }) => [card, format, effective])).toEqual([
      ["called-shot", "2v2", "2026-07-24"],
      ["called-shot", "standard", "2026-03-31"],
      ["the-dreaming-tree", "2v2", "2026-07-24"],
      ["the-dreaming-tree", "standard", "2026-03-31"],
      ["wuju-bladesman-starter", "2v2", "2026-07-24"],
    ]);
  });

  test("keeps future announcements separate from the hub's dated baseline", () => {
    const later = article(
      "November Ban List Updates",
      `<p>Effective: November 23, 2026</p>
      <p>Added to the Standard ban list:</p><h4>Cards</h4><ul><li>Master Yi, Wuju Bladesman</li></ul><hr>`,
      "2026-11-13",
    );
    const result = buildRules({ cards, hub, articles: [first, july, later], overrides });
    expect(result.warnings).toEqual([]);
    expect(
      result.snapshot.bans.find((ban) => ban.card === "wuju-bladesman-starter" && ban.format === "standard")?.effective,
    ).toBe("2026-11-23");
  });

  test("warns on a hub mismatch and rejects unknown names, missing dates and unbans", () => {
    const missing = {
      ...first,
      blocks: readBlocks("<p>Effective: March 31, 2026</p><p>Standard bans:</p><ul><li>Called Shot</li></ul>"),
    };
    expect(buildRules({ cards, hub, articles: [missing, july], overrides }).warnings).toHaveLength(2);
    expect(() =>
      buildRules({ cards, hub, articles: [{ ...first, blocks: readBlocks("<p>No structured list</p>") }], overrides }),
    ).toThrow("Effective");
    const unknown = {
      ...first,
      blocks: readBlocks("<p>Effective: March 31, 2026</p><p>Standard bans:</p><ul><li>Unknown Card</li></ul>"),
    };
    expect(() => buildRules({ cards, hub, articles: [unknown], overrides })).toThrow(
      'missing card name "Unknown Card"',
    );
    expect(() => buildRules({ cards, hub, articles: [{ ...first, title: "Unbans" }], overrides })).toThrow(
      "explicit support",
    );
    expect(() => buildRules({ cards, hub, articles: [{ ...first, title: "Restrictions" }], overrides })).toThrow(
      "explicit support",
    );
  });

  test("imports old and new errata across heading levels and translates card-domain symbols", () => {
    const errata = article(
      "Card Errata",
      `<h1>Origins Cards</h1><h1><strong>Called Shot</strong></h1>
      <h5>[NEW TEXT]</h5><p>Pay [1][C], [E]: Give +2 [M].</p><h4>▲</h4><h5>[OLD TEXT]</h5><p>Pay [A]: Give +1 [S].</p><hr>
      <h2>Master Yi, Wuju Bladesman</h2><p><strong>[NEW TEXT]&nbsp;</strong></p><p>Draw 2.</p><p>▲<br><strong>[OLD TEXT]</strong></p><p>Draw 1.</p>`,
    );
    const result = buildRules({ cards, hub, articles: [first, july, errata], overrides });
    expect(
      result.snapshot.errata.map(({ card, previous, current }) => ({ card: String(card), previous, current })),
    ).toEqual([
      {
        card: "called-shot",
        previous: "Pay :rb_rune_rainbow:: Give +1 :rb_might:.",
        current: "Pay :rb_energy_1::rb_rune_chaos:, :rb_exhaust:: Give +2 :rb_might:.",
      },
      { card: "wuju-bladesman-starter", previous: "Draw 1.", current: "Draw 2." },
    ]);
    expect(parseErrata(readBlocks("<h2>Called Shot</h2><p>[NEW TEXT]</p><p>Draw 2.</p>")).problems).toEqual([
      "Called Shot has no old or no new text",
    ]);
  });

  test("preserves multi-paragraph FAQ answers, nested lists and unbolded Q: questions", () => {
    const entries = parseFaq(
      readBlocks(`<p><strong>Q: Does Called Shot work?</strong></p><p>Yes.</p>
      <ul><li>First.<ul><li>Nested.</li></ul></li><li>Second.</li></ul><p>Final paragraph.</p>
      <p>Q: What about Master Yi, Wuju Bladesman?</p><p>No.</p>
      <p><strong><em>Next card heading</em></strong><br></p><p>Do not append this.</p>`),
    );
    expect(entries).toEqual([
      { question: "Q: Does Called Shot work?", answer: "Yes.\n- First.\nNested.\n- Second.\nFinal paragraph." },
      { question: "Q: What about Master Yi, Wuju Bladesman?", answer: "No." },
    ]);
    expect(() => parseFaq(readBlocks("<p><strong>Unanswered question?</strong></p>"))).toThrow("no answer");
  });

  test("attaches a FAQ to each mentioned card, supports explicit follow-ups and retains general answers", () => {
    const faq = article(
      "Set FAQ",
      `<p><strong>Can Called Shot affect Master Yi, Wuju Bladesman?</strong></p><p>No.</p>
      <p><strong>Can he respond?</strong></p><p>Yes.</p><p><strong>General timing?</strong></p><p>After resolution.</p>`,
    );
    const local = {
      ...overrides,
      faqCards: { [faq.url]: { "Can he respond?": { cards: [cards[1].id], reason: "Master Yi follow-up" } } },
    };
    const result = buildRules({ cards, hub, articles: [first, july, faq], overrides: local });
    expect(result.snapshot.rulings.map((entry) => entry.cards.map(String))).toEqual([
      ["called-shot", "wuju-bladesman-starter"],
      ["wuju-bladesman-starter"],
      [],
    ]);
    expect(result.warnings).toEqual(["Set FAQ: Unmatched FAQ: General timing?"]);
    expect(() => buildRules({ cards, hub, articles: [first, july, { ...faq, blocks: [] }], overrides: local })).toThrow(
      "No FAQ answers",
    );
  });

  test("reads Next.js article metadata and discovers absolute source URLs", () => {
    const page = (blades: unknown[]) =>
      `<script type="application/json" id="__NEXT_DATA__">${JSON.stringify({ props: { pageProps: { page: { title: "Set FAQ", blades } } } })}</script>`;
    const result = readArticle({
      url: "https://playriftbound.com/en-us/set-faq/",
      html: page([
        {
          type: "articleMasthead",
          publishDate: "2026-07-17T00:30:00.000Z",
          category: { machineName: "rules-and-releases" },
        },
        { type: "articleRichText", richText: { body: "<p><strong>Question?</strong></p><p>A &amp; B.</p>" } },
      ]),
    });
    expect(result.publishedAt).toBe("2026-07-17");
    expect(parseFaq(result.blocks)).toEqual([{ question: "Question?", answer: "A & B." }]);
    expect(
      readArticleLinks(
        page([
          { type: "articleCardGrid", items: [{ title: "Set FAQ", action: { payload: { url: "/en-us/set-faq/" } } }] },
        ]),
      ),
    ).toEqual([{ title: "Set FAQ", url: "https://playriftbound.com/en-us/set-faq" }]);
  });

  test("only auto-merges additive non-FAQ updates with no warnings and preserves known entries", () => {
    const previous = buildRules({ cards, hub, articles: [first, july], overrides }).snapshot;
    const decision = (next: RulesSnapshot, warnings: string[] = []) =>
      rulesUpdate({ previous, next, warnings, excludedSources: {} });
    expect(decision(previous)).toEqual({ changed: false, autoMerge: true });
    const next = { ...previous, errata: [{ card: cards[0].id, previous: "Old", current: "New", source: first.url }] };
    expect(decision(next)).toEqual({ changed: true, autoMerge: true });
    expect(decision(next, ["Hub mismatch"]).autoMerge).toBe(false);
    expect(
      decision({ ...previous, rulings: [{ cards: [], question: "Timing?", answer: "Later", source: first.url }] })
        .autoMerge,
    ).toBe(false);
    expect(
      decision({ ...previous, bans: previous.bans.map((ban) => ({ ...ban, effective: "2026-12-01" })) }).autoMerge,
    ).toBe(false);
    expect(() => decision({ ...previous, bans: [] })).toThrow("Refusing to remove");
    expect(rulesUpdate({ previous: null, next, warnings: [], excludedSources: {} }).autoMerge).toBe(false);
  });
});
