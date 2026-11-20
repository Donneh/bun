import { z } from "zod";
import { parseNextData } from "./extract-gallery-items.ts";
import { SCRAPER_USER_AGENT } from "./fetch-gallery.ts";
import { decodeEntities } from "./rich-text.ts";

export const RIOT_SITE = "https://playriftbound.com";
const FETCH_TIMEOUT_MS = 30_000;

export type Block =
  | { readonly kind: "heading"; readonly text: string }
  | { readonly kind: "paragraph"; readonly text: string; readonly bold: boolean }
  | { readonly kind: "list"; readonly items: readonly string[]; readonly ordered: boolean }
  | { readonly kind: "rule" }
  | { readonly kind: "image" };

export type Article = {
  readonly url: string;
  readonly title: string;
  readonly publishedAt: string;
  readonly category: string;
  readonly blocks: readonly Block[];
};

export type ArticleLink = { readonly url: string; readonly title: string };

const BladesSchema = z.object({
  props: z.object({
    pageProps: z.object({
      page: z.object({ title: z.string().min(1), blades: z.array(z.unknown()) }),
    }),
  }),
});
const MastheadSchema = z.object({
  type: z.literal("articleMasthead"),
  publishDate: z.iso.datetime(),
  category: z.object({ machineName: z.string() }),
});
const RichTextSchema = z.object({ type: z.literal("articleRichText"), richText: z.object({ body: z.string() }) });
const ArticleGridSchema = z.object({
  type: z.literal("articleCardGrid"),
  items: z.array(
    z.object({ title: z.string(), action: z.object({ payload: z.object({ url: z.string() }).optional() }) }),
  ),
});

function blades(html: string) {
  const parsed = BladesSchema.safeParse(parseNextData(html));
  if (!parsed.success) throw new Error(`__NEXT_DATA__ has no page blades:\n${z.prettifyError(parsed.error)}`);
  return parsed.data.props.pageProps.page;
}

function findBlade<T>(items: readonly unknown[], schema: z.ZodType<T>, what: string): T {
  for (const item of items) {
    const parsed = schema.safeParse(item);
    if (parsed.success) return parsed.data;
  }
  throw new Error(`The page has no ${what}`);
}

export function absoluteUrl(path: string): string {
  return new URL(path, RIOT_SITE).href.replace(/\/$/, "");
}

export function readArticle({ html, url }: { html: string; url: string }): Article {
  const page = blades(html);
  const masthead = findBlade(page.blades, MastheadSchema, "article masthead");
  const richText = findBlade(page.blades, RichTextSchema, "article text");
  return {
    url: absoluteUrl(url),
    title: page.title,
    publishedAt: masthead.publishDate.slice(0, 10),
    category: masthead.category.machineName,
    blocks: readBlocks(richText.richText.body),
  };
}

export function readArticleLinks(html: string): ArticleLink[] {
  const grid = findBlade(blades(html).blades, ArticleGridSchema, "article list");
  return grid.items.flatMap((item) =>
    item.action.payload === undefined ? [] : [{ url: absoluteUrl(item.action.payload.url), title: item.title }],
  );
}

export function plainText(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>|<\/(?:p|li)>|<li\b[^>]*>/gi, "\n").replace(/<[^>]*>/g, ""))
    .replace(/[ \t\u00a0]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join("\n");
}

const TAG = /<(\/?)([a-z][a-z0-9]*)\b[^>]*>/gi;
const WHOLLY_BOLD = /^(?:<(strong|b)>[\s\S]*<\/\1>\s*)+$/i;

function readBlock(tag: string, inner: string): Block | null {
  const name = tag.toLowerCase();
  if (name === "hr" || name === "img") return name === "hr" ? { kind: "rule" } : { kind: "image" };
  if (name === "ul" || name === "ol")
    return {
      kind: "list",
      ordered: name === "ol",
      items: readElements(inner, /^(?:li)$/)
        .map((item) => plainText(item.inner))
        .filter((item) => item !== ""),
    };
  const text = plainText(inner);
  if (name === "p") {
    if (text === "") return /<img\b/i.test(inner) ? { kind: "image" } : null;
    const bare = inner.replace(/<meta>|<br\s*\/?>|&nbsp;/gi, "").trim();
    return { kind: "paragraph", text, bold: WHOLLY_BOLD.test(bare) };
  }
  return text === "" ? null : { kind: "heading", text };
}

export function readBlocks(html: string): Block[] {
  return readElements(html, /^(?:h[1-6]|p|ul|ol|hr|img)$/).flatMap(({ tag, inner }) => readBlock(tag, inner) ?? []);
}

function readElements(html: string, selected: RegExp): { tag: string; inner: string }[] {
  const elements: { tag: string; inner: string }[] = [];
  let root: { tag: string; start: number; depth: number } | null = null;
  for (const match of html.matchAll(TAG)) {
    const tag = (match[2] ?? "").toLowerCase();
    const closing = match[1] === "/";
    if (root !== null) {
      if (tag !== root.tag) continue;
      root.depth += closing ? -1 : 1;
      if (root.depth === 0) {
        elements.push({ tag, inner: html.slice(root.start, match.index) });
        root = null;
      }
    } else if (!closing && selected.test(tag)) {
      if (tag === "hr" || tag === "img") elements.push({ tag, inner: "" });
      else root = { tag, start: match.index + match[0].length, depth: 1 };
    }
  }
  if (root !== null) throw new Error(`Unclosed <${root.tag}> in Riot article`);
  return elements;
}

export async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": SCRAPER_USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Fetching ${url} failed with HTTP ${response.status} ${response.statusText}`);
  return response.text();
}
