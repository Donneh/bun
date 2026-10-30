import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  DEFAULT_BASE_URL,
  DEFAULT_LOAD_TIMEOUT_MS,
  DEFAULT_OUT_DIR,
  parseArguments,
} from "../verify-live/arguments.ts";

describe("parseArguments", () => {
  test("checks the default pages of production without arguments", () => {
    expect(parseArguments([])).toEqual({
      baseUrl: DEFAULT_BASE_URL,
      paths: [],
      outDir: DEFAULT_OUT_DIR,
      headers: {},
      loadTimeoutMs: DEFAULT_LOAD_TIMEOUT_MS,
    });
  });

  test("takes a base URL followed by paths", () => {
    const options = parseArguments(["http://127.0.0.1:3100/ignored", "/", "/cards/x"]);
    expect(options.baseUrl).toBe("http://127.0.0.1:3100");
    expect(options.paths).toEqual(["/", "/cards/x"]);
  });

  test("takes paths without a base URL", () => {
    expect(parseArguments(["/?q=a"])).toMatchObject({ baseUrl: DEFAULT_BASE_URL, paths: ["/?q=a"] });
  });

  test("resolves the screenshot directory and splits headers at the first colon", () => {
    const options = parseArguments([
      "--out",
      "shots",
      "--header",
      'Cloudflare-Workers-Version-Overrides: riftkeeper-web="a:b"',
      "--header",
      "X-Other:1",
    ]);
    expect(options.outDir).toBe(resolve("shots"));
    expect(options.headers).toEqual({ "Cloudflare-Workers-Version-Overrides": 'riftkeeper-web="a:b"', "X-Other": "1" });
  });

  test("takes a load timeout in milliseconds", () => {
    expect(parseArguments(["--timeout", "5000"]).loadTimeoutMs).toBe(5000);
    expect(() => parseArguments(["--timeout", "0"])).toThrow("is not a timeout");
    expect(() => parseArguments(["--timeout", "5s"])).toThrow("is not a timeout");
  });

  test("rejects a path without a leading slash, a header without a name and unknown options", () => {
    expect(() => parseArguments(["cards"])).toThrow('"cards" is neither a URL nor a path');
    expect(() => parseArguments(["--header", "no colon"])).toThrow("is not a header");
    expect(() => parseArguments(["--header", ": value"])).toThrow("is not a header");
    expect(() => parseArguments(["--verbose"])).toThrow();
  });
});
