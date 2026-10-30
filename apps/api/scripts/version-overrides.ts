export function withVersionOverrides(send: typeof fetch, versionOverrides: string): typeof fetch {
  return Object.assign((input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input instanceof Request ? input : new Request(input.toString()), init);
    request.headers.set("Cloudflare-Workers-Version-Overrides", versionOverrides);
    return send(request);
  }, send);
}

const versionOverrides = process.env.VERSION_OVERRIDES;

if (versionOverrides) {
  globalThis.fetch = withVersionOverrides(globalThis.fetch, versionOverrides);
}
