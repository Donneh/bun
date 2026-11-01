import { expect, test } from "bun:test";
import { Glob } from "bun";

const appDir = new URL("../app/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const valueImportOfWholePackage =
  /import\s+(?!type\b)[^;]*?from\s+"@riftkeeper\/(?:search|cards(?:\/prices|\/snapshot)?)"/;

test("the browser app imports values from @riftkeeper/search and @riftkeeper/cards only through narrow entries, so their parsers and the full zod build stay out of the bundle", async () => {
  const offenders: string[] = [];
  for await (const file of new Glob("**/*.{ts,vue}").scan(appDir))
    if (valueImportOfWholePackage.test(await Bun.file(`${appDir}${file}`).text())) offenders.push(file);
  expect(offenders).toEqual([]);
});
