import type { CardType } from "@riftkeeper/cards";
import type { Format } from "@riftkeeper/cards/rules";
import type { Block } from "./riot-article.ts";

export type ListedName = { readonly name: string; readonly type: CardType | null; readonly format: Format };

export type BanListSection = {
  readonly format: Format;
  readonly updated: string;
  readonly names: readonly ListedName[];
};

export type BanAnnouncement = {
  readonly effective: string | null;
  readonly names: readonly ListedName[];
  readonly problems: readonly string[];
};

export type ErrataEntry = { readonly name: string; readonly before: string; readonly after: string };

export type FaqEntry = { readonly question: string; readonly answer: string };

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const WRITTEN_DATE = /\b([A-Z][a-z]+) (\d{1,2}), (\d{4})\b/;

export function writtenDate(text: string): string | null {
  const match = WRITTEN_DATE.exec(text);
  const month = MONTHS.indexOf(match?.[1]?.toLowerCase() ?? "");
  if (match === null || month === -1) return null;
  return `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[2]?.padStart(2, "0")}`;
}

const SECTION_TYPES: Readonly<Record<string, CardType | null>> = {
  cards: null,
  legend: "legend",
  legends: "legend",
  battlefield: "battlefield",
  battlefields: "battlefield",
};

function sectionType(text: string): { type: CardType | null } | null {
  const type = SECTION_TYPES[text.toLowerCase()];
  return type === undefined ? null : { type };
}

function formatsIn(text: string): Format[] {
  return [
    ...(/\bstandard\b/i.test(text) ? (["standard"] as const) : []),
    ...(/\b2v2\b/i.test(text) ? (["2v2"] as const) : []),
  ];
}

const looksLikeName = (item: string) => item.length <= 60 && !/[.?:]$/.test(item);

export function parseRulesHub(blocks: readonly Block[]): BanListSection[] {
  const sections: { format: Format; updated: string | null; names: ListedName[] }[] = [];
  let current: (typeof sections)[number] | null = null;
  let type: CardType | null = null;
  for (const block of blocks) {
    if (block.kind === "heading") {
      const section = sectionType(block.text);
      if (/legality/i.test(block.text)) {
        current = { format: /\b2v2\b/i.test(block.text) ? "2v2" : "standard", updated: null, names: [] };
        sections.push(current);
        type = null;
      } else if (section !== null) type = section.type;
      else current = null;
    } else if (current !== null && block.kind === "paragraph" && /last updated/i.test(block.text)) {
      current.updated = writtenDate(block.text);
    } else if (current !== null && block.kind === "list") {
      const format = current.format;
      current.names.push(...block.items.map((name) => ({ name, type, format })));
    }
  }
  for (const format of ["standard", "2v2"] as const) {
    const section = sections.find((candidate) => candidate.format === format);
    if (section === undefined || section.names.length === 0)
      throw new Error(`The Rules Hub has no ${format} ban list. Its layout may have changed.`);
    if (section.updated === null) throw new Error(`The Rules Hub ${format} ban list has no "Last updated" date`);
  }
  return sections.map(({ format, updated, names }) => ({ format, updated: updated ?? "", names }));
}

export function parseBanAnnouncement(blocks: readonly Block[]): BanAnnouncement {
  const start = blocks.findIndex((block) => block.kind === "paragraph" && /^Effective\b/i.test(block.text));
  if (start === -1) return { effective: null, names: [], problems: ['It has no "Effective" date'] };
  const effective = writtenDate((blocks[start] as { text: string }).text);
  const names: ListedName[] = [];
  const problems: string[] = effective === null ? ['Its "Effective" line has no date'] : [];
  let formats: Format[] = [];
  let type: CardType | null = null;
  for (const block of blocks.slice(start + 1)) {
    if (block.kind === "rule" || block.kind === "image") {
      if (names.length > 0) break;
      continue;
    }
    if (block.kind === "list") {
      if (block.ordered || !block.items.every(looksLikeName)) break;
      if (formats.length === 0) problems.push(`It does not say which formats ${block.items.join(", ")} are banned in`);
      for (const format of formats) names.push(...block.items.map((name) => ({ name, type, format })));
      continue;
    }
    const section = sectionType(block.text);
    const isHeading = block.kind === "heading" || block.bold;
    if (isHeading && section !== null) type = section.type;
    else if (isHeading && formatsIn(block.text).length > 0) {
      formats = formatsIn(block.text);
      type = null;
    } else if (block.kind === "heading" && names.length > 0) break;
    else if (block.kind === "paragraph" && formats.length === 0) formats = formatsIn(block.text);
  }
  if (names.length === 0) problems.push("It lists no cards");
  return { effective, names, problems };
}

export function parseErrata(blocks: readonly Block[]): { entries: ErrataEntry[]; problems: string[] } {
  const entries: ErrataEntry[] = [];
  const problems: string[] = [];
  let heading: string | null = null;
  let open: { name: string; after: string[]; before: string[]; part: "after" | "between" | "before" } | null = null;
  const close = () => {
    if (open === null) return;
    if (open.after.length === 0 || open.before.length === 0) problems.push(`${open.name} has no old or no new text`);
    else entries.push({ name: open.name, after: open.after.join("\n"), before: open.before.join("\n") });
    open = null;
  };
  for (const block of blocks) {
    if (block.kind === "rule") close();
    if (block.kind === "heading" && block.text !== "▲" && !/^\[(NEW|OLD) TEXT\]$/.test(block.text)) {
      close();
      heading = block.text;
      continue;
    }
    if (block.kind !== "heading" && block.kind !== "paragraph" && block.kind !== "list") continue;
    const lines = block.kind === "list" ? block.items.map((item) => `- ${item}`) : block.text.split("\n");
    for (const line of lines) {
      if (line === "[NEW TEXT]") {
        close();
        if (heading === null) problems.push("A [NEW TEXT] has no card name before it");
        else open = { name: heading, after: [], before: [], part: "after" };
      } else if (open === null) continue;
      else if (line === "▲") open.part = "between";
      else if (line === "[OLD TEXT]") open.part = "before";
      else if (open.part !== "between") open[open.part].push(line);
    }
  }
  close();
  return { entries, problems };
}

export function parseFaq(blocks: readonly Block[]): FaqEntry[] {
  const entries: { question: string; answer: string[] }[] = [];
  let open: (typeof entries)[number] | null = null;
  for (const block of blocks) {
    if (block.kind === "paragraph" && (block.bold || /^Q:/.test(block.text))) {
      open = block.text.endsWith("?") ? { question: block.text, answer: [] } : null;
      if (open !== null) entries.push(open);
    } else if (block.kind === "heading") open = null;
    else if (open !== null && block.kind === "paragraph") open.answer.push(block.text);
    else if (open !== null && block.kind === "list") open.answer.push(...block.items.map((item) => `- ${item}`));
  }
  for (const entry of entries)
    if (entry.answer.length === 0) throw new Error(`FAQ question has no answer: ${entry.question}`);
  return entries.map((entry) => ({ question: entry.question, answer: entry.answer.join("\n") }));
}
