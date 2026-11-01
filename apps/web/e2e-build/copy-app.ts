import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const generatedEntries = new Set([
  "node_modules",
  ".nuxt",
  ".output",
  ".data",
  ".wrangler",
  ".e2e-copy",
  "dist",
  "test-results",
  "playwright-report",
]);

type TsConfig = { references: { path: string }[] };

function isGenerated(entry: string) {
  return generatedEntries.has(entry) || entry.endsWith(".tsbuildinfo");
}

export function copyAppForE2e(appDir: string, copyDir: string) {
  rmSync(copyDir, { recursive: true, force: true });
  for (const entry of readdirSync(appDir)) {
    if (isGenerated(entry) || entry === "tsconfig.json") continue;
    cpSync(join(appDir, entry), join(copyDir, entry), { recursive: true });
  }
  const tsConfig: TsConfig = JSON.parse(readFileSync(join(appDir, "tsconfig.json"), "utf8"));
  const nuxtReferences = tsConfig.references.filter(({ path }) => path.startsWith("./.nuxt/"));
  writeFileSync(join(copyDir, "tsconfig.json"), JSON.stringify({ ...tsConfig, references: nuxtReferences }));
}
