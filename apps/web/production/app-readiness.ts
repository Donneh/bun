import type { APIRequestContext } from "@playwright/test";

export function servesTheApp(html: string, expectedBuildId: string | undefined) {
  if (!html.includes('<div id="__nuxt">')) return false;
  return expectedBuildId === undefined || html.includes(`buildId:"${expectedBuildId}"`);
}

export async function appReadiness(request: APIRequestContext, path: string, expectedBuildId: string | undefined) {
  const response = await request.get(path, { headers: { "cache-control": "no-cache" } });
  if (response.status() !== 200) return `${path}: HTTP ${response.status()}`;
  if (!response.headers()["content-type"]?.includes("text/html")) return `${path}: expected HTML`;

  const html = await response.text();
  if (!servesTheApp(html, expectedBuildId))
    return `${path}: expected app${expectedBuildId ? ` build ${expectedBuildId}` : ""}`;

  const paths = [
    ...new Set([...html.matchAll(/(?:src|href)="(\/_nuxt\/[^"]+\.(?:js|css))"/g)].map(([, asset]) => asset ?? "")),
  ];
  if (!paths.some((asset) => asset.endsWith(".js")) || !paths.some((asset) => asset.endsWith(".css"))) {
    return `${path}: expected scripts and styles`;
  }

  for (const asset of paths) {
    const result = await request.get(asset, { headers: { "cache-control": "no-cache" } });
    if (result.status() !== 200) return `${asset}: HTTP ${result.status()}`;
    const contentType = result.headers()["content-type"] ?? "";
    if (!(asset.endsWith(".css") ? /text\/css/ : /javascript/).test(contentType)) {
      return `${asset}: expected ${asset.endsWith(".css") ? "CSS" : "JavaScript"}, received ${contentType}`;
    }
  }

  return "ready";
}
