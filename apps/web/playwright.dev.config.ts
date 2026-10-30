import { defineConfig } from "@playwright/test";
import { apiBase, apiServer, browserProjects, webBase } from "./playwright.config.ts";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "dev-server",
  outputDir: "test-results/dev-server",
  forbidOnly: isCi,
  workers: 1,
  reporter: isCi ? [["github"], ["list"]] : "list",
  use: {
    baseURL: webBase,
    screenshot: "on",
    trace: "retain-on-failure",
  },
  projects: browserProjects,
  webServer: [
    apiServer,
    {
      command: `node node_modules/nuxt/bin/nuxt.mjs dev --host 127.0.0.1 --port ${new URL(webBase).port}`,
      url: webBase,
      env: { NUXT_PUBLIC_API_BASE: apiBase },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
