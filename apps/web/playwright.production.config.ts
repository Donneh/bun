import { defineConfig, devices } from "@playwright/test";

function requiredUrl(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} to the deployed URL, for example https://riftkeeper.app`);
  return new URL(value).origin;
}

export const webUrl = requiredUrl("BASE_URL");
export const wwwUrl = requiredUrl("WWW_URL");
export const expectedBuildId = process.env.EXPECTED_BUILD_ID;
export const expectedApiVersion = process.env.EXPECTED_API_VERSION;
const versionOverrides = process.env.VERSION_OVERRIDES;

export default defineConfig({
  testDir: "production",
  outputDir: "test-results",
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: webUrl,
    extraHTTPHeaders: versionOverrides ? { "Cloudflare-Workers-Version-Overrides": versionOverrides } : {},
    screenshot: "on",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
