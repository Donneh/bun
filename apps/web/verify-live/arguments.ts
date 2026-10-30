import { resolve } from "node:path";
import { parseArgs } from "node:util";

export const DEFAULT_BASE_URL = "https://riftkeeper.app";
export const DEFAULT_OUT_DIR = resolve(import.meta.dirname, "../test-results/verify-live");

export const USAGE = `Usage: bun run verify:live [base-url] [path...] [--out <dir>] [--header "<Name>: <value>"]...

  base-url  the deployed site, default ${DEFAULT_BASE_URL}
  path      pages to check, each starting with "/"; default the home page, a search,
            a card page picked from that search and an unknown path
  --out     directory for the screenshots, default ${DEFAULT_OUT_DIR}
  --header  an HTTP header for every request, such as
            "Cloudflare-Workers-Version-Overrides: riftkeeper-web=\\"<version id>\\""`;

export interface VerifyOptions {
  readonly baseUrl: string;
  readonly paths: readonly string[];
  readonly outDir: string;
  readonly headers: Readonly<Record<string, string>>;
}

export function parseArguments(args: readonly string[]): VerifyOptions {
  const { values, positionals } = parseArgs({
    args: [...args],
    options: { out: { type: "string" }, header: { type: "string", multiple: true } },
    allowPositionals: true,
    strict: true,
  });
  const [first, ...rest] = positionals;
  const hasBaseUrl = first !== undefined && /^https?:\/\//.test(first);
  const paths = hasBaseUrl ? rest : positionals;
  const invalidPath = paths.find((path) => !path.startsWith("/"));
  if (invalidPath !== undefined) throw new Error(`"${invalidPath}" is neither a URL nor a path starting with "/"`);
  return {
    baseUrl: new URL(hasBaseUrl ? first : DEFAULT_BASE_URL).origin,
    paths,
    outDir: values.out === undefined ? DEFAULT_OUT_DIR : resolve(values.out),
    headers: Object.fromEntries((values.header ?? []).map(parseHeader)),
  };
}

function parseHeader(header: string): [string, string] {
  const separator = header.indexOf(":");
  const name = header.slice(0, separator).trim();
  if (separator < 0 || name === "") throw new Error(`"${header}" is not a header of the form "Name: value"`);
  return [name, header.slice(separator + 1).trim()];
}
