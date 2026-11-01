import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyAppForE2e } from "../e2e-build/copy-app.ts";

let appDir: string;
let copyDir: string;

function writeFile(path: string, content = "") {
  mkdirSync(join(appDir, path, ".."), { recursive: true });
  writeFileSync(join(appDir, path), content);
}

beforeEach(() => {
  appDir = mkdtempSync(join(tmpdir(), "e2e-build-"));
  copyDir = join(appDir, ".e2e-copy");
  writeFile(
    "tsconfig.json",
    JSON.stringify({
      files: [],
      references: [{ path: "./.nuxt/tsconfig.app.json" }, { path: "./tsconfig.e2e.json" }],
    }),
  );
  writeFile("nuxt.config.ts");
  writeFile("app/app.vue");
  writeFile("server/api/hello.ts");
  writeFile("public/robots.txt");
  writeFile("app.config.ts");
  writeFile("node_modules/nuxt/package.json");
  writeFile(".nuxt/tsconfig.app.json");
  writeFile(".output/public/index.html");
  writeFile("test-results/video.webm");
  writeFile("tsconfig.e2e.tsbuildinfo");
  writeFile(".e2e-copy/stale.txt");
});

afterEach(() => rmSync(appDir, { recursive: true, force: true }));

test("the copy has every source entry, including ones added later such as server, public and app.config.ts", () => {
  copyAppForE2e(appDir, copyDir);

  for (const path of ["nuxt.config.ts", "app/app.vue", "server/api/hello.ts", "public/robots.txt", "app.config.ts"]) {
    expect(existsSync(join(copyDir, path))).toBe(true);
  }
});

test("the copy leaves out installed packages, build output and test results", () => {
  copyAppForE2e(appDir, copyDir);

  for (const path of ["node_modules", ".nuxt", ".output", "test-results", "tsconfig.e2e.tsbuildinfo", "stale.txt"]) {
    expect(existsSync(join(copyDir, path))).toBe(false);
  }
});

test("the copied tsconfig keeps only the references into its own .nuxt", () => {
  copyAppForE2e(appDir, copyDir);

  expect(JSON.parse(readFileSync(join(copyDir, "tsconfig.json"), "utf8"))).toEqual({
    files: [],
    references: [{ path: "./.nuxt/tsconfig.app.json" }],
  });
});
