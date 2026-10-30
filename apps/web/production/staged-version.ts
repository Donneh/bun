import { test as consoleTest, expect } from "../e2e/browser-console.ts";
import { versionOverrides, webUrl } from "../playwright.production.config.ts";

const VERSION_OVERRIDES_HEADER = "Cloudflare-Workers-Version-Overrides";
const siteHost = new URL(webUrl).hostname;

export const isOwnHost = (url: URL) => url.hostname === siteHost || url.hostname.endsWith(`.${siteHost}`);

const overrideHeaders: Record<string, string> = versionOverrides
  ? { [VERSION_OVERRIDES_HEADER]: versionOverrides }
  : {};

export const test = consoleTest.extend({
  request: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: webUrl, extraHTTPHeaders: overrideHeaders });
    await use(request);
    await request.dispose();
  },
  context: async ({ context }, use) => {
    if (versionOverrides) {
      await context.route(isOwnHost, (route) =>
        route.continue({ headers: { ...route.request().headers(), ...overrideHeaders } }),
      );
    }
    await use(context);
  },
});

export { expect };
