import { defineConfig, devices } from "@playwright/test";

const apiPort = Number(process.env.E2E_API_PORT ?? 8787);
const webPort = Number(process.env.E2E_WEB_PORT ?? 3100);
const isCi = Boolean(process.env.CI);

export const apiBase = `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  forbidOnly: isCi,
  workers: 1,
  reporter: isCi ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    video: "on",
    screenshot: "on",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `node node_modules/wrangler/bin/wrangler.js dev --ip 127.0.0.1 --port ${apiPort} --show-interactive-dev-session=false`,
      cwd: "../api",
      url: `${apiBase}/health`,
      env: { WRANGLER_SEND_METRICS: "false" },
      reuseExistingServer: !isCi,
      timeout: 60_000,
    },
    {
      command: `node node_modules/nuxt/bin/nuxt.mjs generate && node node_modules/wrangler/bin/wrangler.js dev --ip 127.0.0.1 --port ${webPort} --show-interactive-dev-session=false`,
      url: `http://127.0.0.1:${webPort}`,
      env: { NUXT_PUBLIC_API_BASE: apiBase, WRANGLER_SEND_METRICS: "false" },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
