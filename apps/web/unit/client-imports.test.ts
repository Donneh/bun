import { expect, test } from "bun:test";
import { Glob } from "bun";

const appDir = new URL("../app/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const valueImportOfWholePackage =
  /import\s+(?!type\b)[^;]*?from\s+"@riftkeeper\/(?:search|cards(?:\/prices|\/snapshot)?)"/;
const valueImportOfFullZod = /import\s+(?!type\b)[^;]*?from\s+"zod(?!\/mini")[^"]*"/;

async function filesMatching(pattern: RegExp) {
  const offenders: string[] = [];
  for await (const file of new Glob("**/*.{ts,vue}").scan(appDir))
    if (pattern.test(await Bun.file(`${appDir}${file}`).text())) offenders.push(file);
  return offenders;
}

test("the browser app imports values from @riftkeeper/search and @riftkeeper/cards only through narrow entries, so their parsers and zod stay out of the bundle", async () => {
  expect(await filesMatching(valueImportOfWholePackage)).toEqual([]);
});

test("the browser app imports zod values only from zod/mini, so the full zod build stays out of the bundle", async () => {
  expect(valueImportOfFullZod.test('import * as z from "zod";')).toBe(true);
  expect(valueImportOfFullZod.test('import { z } from "zod/v4";')).toBe(true);
  expect(valueImportOfFullZod.test('import * as z from "zod/mini";')).toBe(false);
  expect(valueImportOfFullZod.test('import type { z } from "zod";')).toBe(false);
  expect(await filesMatching(valueImportOfFullZod)).toEqual([]);
});
