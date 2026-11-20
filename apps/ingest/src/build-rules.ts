import { type Card, type CardId, CardIdSchema } from "@riftkeeper/cards";
import { type Ban, type RulesSnapshot, RulesSnapshotSchema } from "@riftkeeper/cards/rules";
import { z } from "zod";
import { cardNames } from "./card-names.ts";
import type { Article } from "./riot-article.ts";
import { ownDomainRune, toGallerySymbols } from "./riot-symbols.ts";
import { type ListedName, parseBanAnnouncement, parseErrata, parseFaq, parseRulesHub } from "./rules-articles.ts";

export const RulesOverridesSchema = z.object({
  aliases: z.record(z.string(), CardIdSchema),
  domainRunes: z.record(
    CardIdSchema,
    z.object({ rune: z.string().regex(/^:rb_rune_[a-z]+:$/), reason: z.string().min(1) }),
  ),
  excludedSources: z.record(z.url(), z.string().min(1)),
  faqCards: z.record(
    z.url(),
    z.record(z.string(), z.object({ cards: z.array(CardIdSchema), reason: z.string().min(1) })),
  ),
});
export type RulesOverrides = z.infer<typeof RulesOverridesSchema>;

export function articleKind(title: string): "bans" | "errata" | "faq" | null {
  if (/\berrata\b/i.test(title)) return "errata";
  if (/\b(bans?|banned|unbans?|restrictions?|restricted)\b/i.test(title)) return "bans";
  if (/\bFAQ\b/i.test(title) && !/merch|drawing|qualification/i.test(title)) return "faq";
  return null;
}

export function buildRules({
  cards,
  hub,
  articles,
  overrides,
}: {
  cards: readonly Card[];
  hub: Article;
  articles: readonly Article[];
  overrides: RulesOverrides;
}): { snapshot: RulesSnapshot; warnings: string[] } {
  const byId = new Map<string, Card>(cards.map((card) => [card.id, card]));
  for (const id of [
    ...Object.values(overrides.aliases),
    ...Object.keys(overrides.domainRunes),
    ...Object.values(overrides.faqCards).flatMap((questions) =>
      Object.values(questions).flatMap((entry) => entry.cards),
    ),
  ])
    if (!byId.has(id)) throw new Error(`Rules override names unknown card ${id}`);
  const names = cardNames({ cards, aliases: overrides.aliases });
  const snapshot: RulesSnapshot = { sources: [], bans: [], errata: [], rulings: [] };
  const warnings: string[] = [];
  const resolve = (entry: ListedName | { name: string }, source: string): CardId => {
    const match = names.resolve(entry.name, "type" in entry ? entry.type : null);
    if (match.kind !== "found") throw new Error(`${source}: ${match.kind} card name "${entry.name}"`);
    return match.id;
  };
  const source = (article: Article) => {
    snapshot.sources.push({ url: article.url, title: article.title, publishedAt: article.publishedAt });
  };
  for (const article of [...articles].sort(
    (a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.url.localeCompare(b.url),
  )) {
    if (overrides.excludedSources[article.url] !== undefined) continue;
    const kind = articleKind(article.title);
    if (kind === null) throw new Error(`Unknown rules article: ${article.title}`);
    source(article);
    if (kind === "bans") {
      const parsed = parseBanAnnouncement(article.blocks);
      if (parsed.problems.length > 0 || parsed.effective === null)
        throw new Error(`${article.title}: ${parsed.problems.join("; ")}`);
      const text = article.blocks.flatMap((block) => ("text" in block ? [block.text] : [])).join("\n");
      if (/\bunban|\brestrict(?:ed|ions?)\b|\bremoved from (?:the )?.*ban list/i.test(text + article.title))
        throw new Error(`${article.title}: ban removals and restrictions need explicit support before importing`);
      const introduced2v2 = article.blocks.some(
        (block) => block.kind === "paragraph" && /introducing a 2v2 ban list/i.test(block.text),
      );
      const additions: Ban[] = parsed.names.map((entry) => ({
        card: resolve(entry, article.title),
        format: entry.format,
        effective: parsed.effective as string,
        source: article.url,
      }));
      if (introduced2v2)
        additions.push(
          ...[...snapshot.bans, ...additions]
            .filter((ban) => ban.format === "standard")
            .map((ban) => ({
              ...ban,
              format: "2v2" as const,
              effective: parsed.effective as string,
              source: article.url,
            })),
        );
      for (const ban of additions)
        if (!snapshot.bans.some((existing) => existing.card === ban.card && existing.format === ban.format))
          snapshot.bans.push(ban);
    } else if (kind === "errata") {
      const parsed = parseErrata(article.blocks);
      if (parsed.problems.length > 0 || parsed.entries.length === 0)
        throw new Error(`${article.title}: ${parsed.problems.join("; ") || "No errata found"}`);
      for (const entry of parsed.entries) {
        const id = resolve(entry, article.title);
        const card = byId.get(id) as Card;
        const rune = overrides.domainRunes[id]?.rune ?? ownDomainRune(card.domains);
        if (rune === null && /\[C\]/.test(entry.before + entry.after))
          throw new Error(`${article.title}: ${entry.name} has an ambiguous [C] symbol`);
        snapshot.errata.push({
          card: id,
          previous: toGallerySymbols(entry.before, rune),
          current: toGallerySymbols(entry.after, rune),
          source: article.url,
        });
      }
    } else {
      const parsed = parseFaq(article.blocks);
      if (parsed.length === 0)
        throw new Error(`${article.title}: No FAQ answers found; explicitly exclude an archived source`);
      for (const entry of parsed) {
        const override = overrides.faqCards[article.url]?.[entry.question];
        const ids = override?.cards ?? names.mentions(`${entry.question}\n${entry.answer}`);
        if (ids.length === 0) {
          if (override === undefined) warnings.push(`${article.title}: Unmatched FAQ: ${entry.question}`);
        }
        snapshot.rulings.push({ cards: [...new Set(ids)].sort(), ...entry, source: article.url });
      }
      for (const question of Object.keys(overrides.faqCards[article.url] ?? {}))
        if (!parsed.some((entry) => entry.question === question))
          throw new Error(`${article.title}: Stale FAQ override: ${question}`);
    }
  }
  source(hub);
  for (const section of parseRulesHub(hub.blocks)) {
    const listed = new Set(section.names.map((entry) => resolve(entry, hub.title)));
    const known = new Set(
      snapshot.bans
        .filter((ban) => ban.format === section.format && ban.effective <= section.updated)
        .map((ban) => ban.card),
    );
    for (const id of new Set([...listed, ...known]))
      if (listed.has(id) !== known.has(id))
        warnings.push(
          `${section.format} on ${section.updated}: ${id} ${listed.has(id) ? "is only in the Rules Hub" : "is missing from the Rules Hub"}`,
        );
  }
  snapshot.sources.sort((a, b) => a.url.localeCompare(b.url));
  snapshot.bans.sort((a, b) => a.card.localeCompare(b.card) || a.format.localeCompare(b.format));
  return { snapshot: RulesSnapshotSchema.parse(snapshot), warnings };
}
