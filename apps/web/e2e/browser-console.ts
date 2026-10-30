import { test as base, type ConsoleMessage, expect, type Page, type Request } from "@playwright/test";

export type BrowserMessageKind = "console error" | "console warning" | "page error" | "failed request";

export interface BrowserMessage {
  readonly kind: BrowserMessageKind;
  readonly text: string;
}

export interface ExpectedMessage {
  readonly description: string;
  readonly kind: BrowserMessageKind;
  readonly pattern: RegExp;
}

export interface BrowserConsole {
  expect(...messages: readonly ExpectedMessage[]): void;
}

const CONSOLE_KINDS: Readonly<Partial<Record<string, BrowserMessageKind>>> = {
  error: "console error",
  warning: "console warning",
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function failedResponse(status: number, path: string | RegExp): ExpectedMessage {
  const url = typeof path === "string" ? `https?://[^/]+${escapeRegExp(path)}(?:[?#].*)?` : path.source;
  return {
    description: `the browser reports the ${status} answer to ${path}`,
    kind: "console error",
    pattern: new RegExp(`^Failed to load resource: the server responded with a status of ${status}\\b.* \\(${url}\\)$`),
  };
}

export const unknownCardResponse = (id: string) => failedResponse(404, `/cards/${encodeURIComponent(id)}`);

function describeConsoleMessage(message: ConsoleMessage) {
  const { url } = message.location();
  return url ? `${message.text()} (${url})` : message.text();
}

function describeFailedRequest(request: Request) {
  return `${request.failure()?.errorText ?? "failed"} ${request.method()} ${request.url()}`;
}

const wasAbortedByTheBrowser = (request: Request) => request.failure()?.errorText === "net::ERR_ABORTED";

const SETTLE_TIMEOUT_MS = 5_000;
const SETTLE_POLL_MS = 50;

async function settle(pages: readonly Page[], inFlight: ReadonlySet<Request>) {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  while (inFlight.size > 0 && Date.now() < deadline) await new Promise((wait) => setTimeout(wait, SETTLE_POLL_MS));
  await Promise.all(pages.map((page) => page.evaluate(() => undefined).catch(() => undefined)));
}

const matches = (expected: ExpectedMessage, message: BrowserMessage) =>
  expected.kind === message.kind && expected.pattern.test(message.text);

export const test = base.extend<{ browserConsole: BrowserConsole }>({
  browserConsole: [
    async ({ context }, use) => {
      const recorded: BrowserMessage[] = [];
      const expected: ExpectedMessage[] = [];
      const inFlight = new Set<Request>();
      const watch = (page: Page) => {
        page.on("console", (message) => {
          const kind = CONSOLE_KINDS[message.type()];
          if (kind) recorded.push({ kind, text: describeConsoleMessage(message) });
        });
        page.on("pageerror", (error) => recorded.push({ kind: "page error", text: error.message }));
        page.on("request", (request) => inFlight.add(request));
        page.on("requestfinished", (request) => inFlight.delete(request));
        page.on("requestfailed", (request) => {
          inFlight.delete(request);
          if (!wasAbortedByTheBrowser(request))
            recorded.push({ kind: "failed request", text: describeFailedRequest(request) });
        });
      };
      for (const page of context.pages()) watch(page);
      context.on("page", watch);

      await use({ expect: (...messages) => expected.push(...messages) });
      await settle(context.pages(), inFlight);

      const unexpected = recorded.filter((message) => !expected.some((candidate) => matches(candidate, message)));
      const missing = expected.filter((candidate) => !recorded.some((message) => matches(candidate, message)));
      expect(
        unexpected.map((message) => `${message.kind}: ${message.text}`),
        "the browser reported messages this test does not expect",
      ).toEqual([]);
      expect(
        missing.map((candidate) => candidate.description),
        "messages this test expects did not appear",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
