export type Block = string;

export const COLLAPSE_THRESHOLD = 15;
export const MAX_COLLAPSED_BLOCK_LENGTH = 8_000;

export function plural({ count, noun }: { count: number; noun: string }): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function inlineCode(text: string): string {
  return text.includes("`") ? `\`\` ${text} \`\`` : `\`${text}\``;
}

export function indented({ lines, by }: { lines: readonly string[]; by: number }): string[] {
  const padding = " ".repeat(by);
  return lines.map((line) => (line === "" ? line : padding + line));
}

export function diffBlock({ previous, next }: { previous: string | null; next: string | null }): string[] {
  const side = ({ text, marker }: { text: string | null; marker: string }) =>
    text === null ? [] : text.split("\n").map((line) => `${marker} ${line}`);
  return ["````diff", ...side({ text: previous, marker: "-" }), ...side({ text: next, marker: "+" }), "````"];
}

export function renderBlocks(blocks: readonly Block[]): string {
  return blocks.length === 0 ? "" : `${blocks.join("\n\n")}\n`;
}

export function withHeading({ heading, blocks }: { heading: string; blocks: readonly Block[] }): Block[] {
  const [first, ...rest] = blocks;
  return first === undefined ? [] : [`${heading}\n\n${first}`, ...rest];
}

function collapsible({ summary, body }: { summary: string; body: string }): Block {
  return `<details>\n<summary>${summary}</summary>\n\n${body}\n\n</details>`;
}

function chunkByLength({ items, separator }: { items: readonly string[]; separator: string }): string[][] {
  const chunks: string[][] = [];
  let length = 0;
  for (const item of items) {
    const current = chunks.at(-1);
    if (current === undefined || length + separator.length + item.length > MAX_COLLAPSED_BLOCK_LENGTH) {
      chunks.push([item]);
      length = item.length;
    } else {
      current.push(item);
      length += separator.length + item.length;
    }
  }
  return chunks;
}

export function itemSection({
  heading,
  noun,
  items,
  separator = "\n",
}: {
  heading: string;
  noun: string;
  items: readonly string[];
  separator?: string;
}): Block[] {
  if (items.length === 0) return [];
  if (items.length <= COLLAPSE_THRESHOLD) return [`${heading}\n\n${items.join(separator)}`];
  const chunks = chunkByLength({ items, separator });
  let shown = 0;
  const blocks = chunks.map((chunk) => {
    const summary =
      chunks.length === 1
        ? `Show ${plural({ count: items.length, noun })}`
        : `Show ${noun}s ${shown + 1}-${shown + chunk.length} of ${items.length}`;
    shown += chunk.length;
    return collapsible({ summary, body: chunk.join(separator) });
  });
  return withHeading({ heading, blocks });
}
