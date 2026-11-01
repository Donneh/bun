import { SEARCH_QUERY } from "./arguments.ts";

export const MAX_REQUESTED_PAGES = 6;
export const MAX_PATH_LENGTH = 200;

export type RequestedPage =
  | { readonly line: string; readonly path: string }
  | { readonly line: string; readonly cardSearch: string };

export type RejectionReason =
  | "not-a-path"
  | "file"
  | "too-long"
  | "unreadable"
  | "over-limit"
  | "duplicate"
  | "no-card";

export interface RejectedLine {
  readonly line: string;
  readonly reason: RejectionReason;
}

export interface ScreenshotRequest {
  readonly pages: readonly RequestedPage[];
  readonly rejected: readonly RejectedLine[];
}

export interface RequestedPaths {
  readonly paths: readonly string[];
  readonly rejected: readonly RejectedLine[];
}

export const NO_REQUESTED_PATHS: RequestedPaths = { paths: [], rejected: [] };

const OPENING_FENCE = /^ {0,3}```\s*screenshots\s*$/;
const CLOSING_FENCE = /^ {0,3}```+\s*$/;
const CARD_PLACEHOLDER = /^\/cards\/\{card(?::(.*))?\}$/;
const INVISIBLE_OR_CONTROL = /\p{C}/u;
const PARSING_ORIGIN = "https://pull-request.invalid";

export function parseScreenshotRequest(body: string): ScreenshotRequest {
  const pages: RequestedPage[] = [];
  const rejected: RejectedLine[] = [];
  for (const line of blockLines(body)) {
    const page = parseLine(line);
    if ("reason" in page) rejected.push(page);
    else if (pages.some((shown) => sameTarget(shown, page))) rejected.push({ line, reason: "duplicate" });
    else if (pages.length >= MAX_REQUESTED_PAGES) rejected.push({ line, reason: "over-limit" });
    else pages.push(page);
  }
  return { pages, rejected };
}

export function samePath(first: string, second: string): boolean {
  return decodeURIComponent(first) === decodeURIComponent(second);
}

function blockLines(body: string): string[] {
  const lines: string[] = [];
  let inBlock = false;
  for (const rawLine of body.split(/\r?\n/)) {
    if (!inBlock) inBlock = OPENING_FENCE.test(rawLine);
    else if (CLOSING_FENCE.test(rawLine)) inBlock = false;
    else if (rawLine.trim() !== "") lines.push(rawLine.trim());
  }
  return lines;
}

function parseLine(line: string): RequestedPage | RejectedLine {
  if (INVISIBLE_OR_CONTROL.test(line)) return { line, reason: "unreadable" };
  if (!line.startsWith("/") || line.startsWith("//") || line.includes("\\")) return { line, reason: "not-a-path" };
  const card = CARD_PLACEHOLDER.exec(line);
  if (card) return parseCardPlaceholder(line, card[1]);
  const url = new URL(line, PARSING_ORIGIN);
  if (url.origin !== PARSING_ORIGIN) return { line, reason: "not-a-path" };
  const path = `${url.pathname}${url.search}${url.hash}`;
  if (path.length > MAX_PATH_LENGTH) return { line, reason: "too-long" };
  if (!isReadable(path)) return { line, reason: "unreadable" };
  if (url.pathname.startsWith("/_") || /\.[^/]*$/.test(url.pathname)) return { line, reason: "file" };
  return { line, path };
}

function parseCardPlaceholder(line: string, search: string | undefined): RequestedPage | RejectedLine {
  if (search === undefined) return { line, cardSearch: SEARCH_QUERY };
  const cardSearch = search.trim();
  if (cardSearch === "") return { line, reason: "not-a-path" };
  if (cardSearch.length > MAX_PATH_LENGTH) return { line, reason: "too-long" };
  return { line, cardSearch };
}

function isReadable(path: string): boolean {
  try {
    return !INVISIBLE_OR_CONTROL.test(decodeURIComponent(path));
  } catch {
    return false;
  }
}

function sameTarget(first: RequestedPage, second: RequestedPage): boolean {
  if ("path" in first && "path" in second) return samePath(first.path, second.path);
  if ("cardSearch" in first && "cardSearch" in second) return first.cardSearch === second.cardSearch;
  return false;
}
