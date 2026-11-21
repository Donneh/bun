export function withVersionOverrides(send: typeof fetch, versionOverrides: string): typeof fetch {
  return Object.assign((input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input instanceof Request ? input : new Request(input.toString()), init);
    request.headers.set("Cloudflare-Workers-Version-Overrides", versionOverrides);
    return send(request);
  }, send);
}

export function withExpectedVersion(
  send: typeof fetch,
  expectedVersion: string,
  { attempts = 60, delayMs = 500 } = {},
): typeof fetch {
  return Object.assign(async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input instanceof Request ? input : new Request(input.toString()), init);
    for (let attempt = 1; ; attempt++) {
      const response = await send(request.clone() as Request);
      if (response.headers.get("x-worker-version") === expectedVersion || attempt === attempts) return response;
      await response.body?.cancel();
      await Bun.sleep(delayMs);
    }
  }, send);
}

const versionOverrides = process.env.VERSION_OVERRIDES;
const expectedVersion = process.env.EXPECTED_VERSION;

if (versionOverrides) {
  globalThis.fetch = withVersionOverrides(globalThis.fetch, versionOverrides);
}
if (expectedVersion) {
  globalThis.fetch = withExpectedVersion(globalThis.fetch, expectedVersion);
}
