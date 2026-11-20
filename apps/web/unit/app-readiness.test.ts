import { expect, test } from "bun:test";
import { request } from "@playwright/test";
import { appReadiness } from "../production/app-readiness.ts";

const html = (build: string) =>
  `<div id="__nuxt"></div><script>buildId:"${build}"</script><script src="/_nuxt/app.js"></script><link href="/_nuxt/entry.css" rel="stylesheet">`;

test("a new HTML build is not ready until both its scripts and styles serve assets rather than SPA fallbacks", async () => {
  let phase: "old" | "css-missing" | "js-missing" | "ready" = "old";
  const server = Bun.serve({
    port: 0,
    fetch(req) {
      const path = new URL(req.url).pathname;
      if (path === "/_nuxt/entry.css" && phase !== "css-missing") {
        return new Response("body {}", { headers: { "content-type": "text/css" } });
      }
      if (path === "/_nuxt/app.js" && phase !== "js-missing") {
        return new Response("export {};", { headers: { "content-type": "text/javascript" } });
      }
      return new Response(html(phase === "old" ? "old" : "new"), { headers: { "content-type": "text/html" } });
    },
  });
  const client = await request.newContext({ baseURL: server.url.toString() });
  try {
    expect(await appReadiness(client, "/", "new")).toBe("/: expected app build new");
    phase = "css-missing";
    expect(await appReadiness(client, "/", "new")).toBe("/_nuxt/entry.css: expected CSS, received text/html");
    phase = "js-missing";
    expect(await appReadiness(client, "/", "new")).toBe("/_nuxt/app.js: expected JavaScript, received text/html");
    phase = "ready";
    expect(await appReadiness(client, "/", "new")).toBe("ready");
    expect(await appReadiness(client, "/", undefined)).toBe("ready");
  } finally {
    await client.dispose();
    server.stop(true);
  }
});

test("readiness checks the requested route, not only the home page", async () => {
  let propagated = false;
  const path = "/?q=c%3Afury";
  const server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname.endsWith(".css")) return new Response("", { headers: { "content-type": "text/css" } });
      if (url.pathname.endsWith(".js"))
        return new Response("", { headers: { "content-type": "application/javascript" } });
      return new Response(html(url.search && !propagated ? "old" : "new"), {
        headers: { "content-type": "text/html" },
      });
    },
  });
  const client = await request.newContext({ baseURL: server.url.toString() });
  try {
    expect(await appReadiness(client, "/", "new")).toBe("ready");
    expect(await appReadiness(client, path, "new")).toBe(`${path}: expected app build new`);
    propagated = true;
    expect(await appReadiness(client, path, "new")).toBe("ready");
  } finally {
    await client.dispose();
    server.stop(true);
  }
});
