import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type TsConfig = { references: { path: string }[] };

const [copyDir] = process.argv.slice(2);
if (!copyDir) throw new Error("Usage: node copy-app-for-e2e.ts <directory>");

rmSync(copyDir, { recursive: true, force: true });
cpSync("app", join(copyDir, "app"), { recursive: true });
cpSync("nuxt.config.ts", join(copyDir, "nuxt.config.ts"));
const tsConfig: TsConfig = JSON.parse(readFileSync("tsconfig.json", "utf8"));
const nuxtReferences = tsConfig.references.filter(({ path }) => path.startsWith("./.nuxt/"));
writeFileSync(join(copyDir, "tsconfig.json"), JSON.stringify({ ...tsConfig, references: nuxtReferences }));
