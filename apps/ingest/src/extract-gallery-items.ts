import { z } from "zod";
import { type RawPrinting, RawPrintingSchema } from "./riot-gallery.schema.ts";

const NEXT_DATA_SCRIPT = /<script\b[^>]*\bid="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

const NextDataSchema = z.object({
  props: z.object({ pageProps: z.object({ page: z.object({ blades: z.array(z.unknown()) }) }) }),
});
const CardsBladeSchema = z.object({ cards: z.object({ items: z.array(z.unknown()) }) });

function parseNextData(html: string): unknown {
  const script = NEXT_DATA_SCRIPT.exec(html);
  if (!script?.[1]) {
    throw new Error("Gallery HTML has no __NEXT_DATA__ script tag");
  }
  try {
    return JSON.parse(script[1]);
  } catch (error) {
    throw new Error("__NEXT_DATA__ script does not contain valid JSON", { cause: error });
  }
}

function findCardItems(nextData: unknown): unknown[] {
  const parsed = NextDataSchema.safeParse(nextData);
  if (!parsed.success) {
    throw new Error(`__NEXT_DATA__ has no props.pageProps.page.blades:\n${z.prettifyError(parsed.error)}`);
  }
  for (const blade of parsed.data.props.pageProps.page.blades) {
    const cardsBlade = CardsBladeSchema.safeParse(blade);
    if (cardsBlade.success) {
      return cardsBlade.data.cards.items;
    }
  }
  throw new Error("No blade with cards.items found in __NEXT_DATA__");
}

const EXAMPLE_ID_COUNT = 3;

type IssueGroup = { path: string; message: string; indices: Set<number>; exampleIds: string[] };

function itemId(item: unknown): string | undefined {
  const parsed = z.object({ id: z.string() }).safeParse(item);
  return parsed.success ? parsed.data.id : undefined;
}

function groupItemIssues({ issues, items }: { issues: readonly z.core.$ZodIssue[]; items: readonly unknown[] }) {
  const groups = new Map<string, IssueGroup>();
  for (const issue of issues) {
    const [index, ...rest] = issue.path;
    const path = rest.map(String).join(".") || "(item)";
    const key = JSON.stringify([path, issue.message]);
    const group = groups.get(key) ?? { path, message: issue.message, indices: new Set<number>(), exampleIds: [] };
    if (typeof index === "number") group.indices.add(index);
    const id = typeof index === "number" ? itemId(items[index]) : undefined;
    if (id !== undefined && group.exampleIds.length < EXAMPLE_ID_COUNT && !group.exampleIds.includes(id)) {
      group.exampleIds.push(id);
    }
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => right.indices.size - left.indices.size);
}

export function describeItemIssues({
  issues,
  items,
}: {
  issues: readonly z.core.$ZodIssue[];
  items: readonly unknown[];
}): string {
  const groups = groupItemIssues({ issues, items });
  const affected = new Set(groups.flatMap(({ indices }) => [...indices])).size;
  const lines = groups.map(({ path, message, indices, exampleIds }) => {
    const examples = exampleIds.length > 0 ? ` (e.g. ${exampleIds.join(", ")})` : "";
    return `- ${path}: ${message} [${indices.size} printings${examples}]`;
  });
  return [`Gallery items do not match the expected shape in ${affected} of ${items.length} printings:`, ...lines].join(
    "\n",
  );
}

export function extractGalleryItems(html: string): RawPrinting[] {
  const items = findCardItems(parseNextData(html));
  if (items.length === 0) {
    throw new Error("Gallery cards blade is empty");
  }
  const parsed = z.array(RawPrintingSchema).safeParse(items);
  if (!parsed.success) {
    throw new Error(describeItemIssues({ issues: parsed.error.issues, items }));
  }
  return parsed.data;
}
