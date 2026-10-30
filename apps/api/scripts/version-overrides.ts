const versionOverrides = process.env.VERSION_OVERRIDES;

if (versionOverrides) {
  const unrouted = globalThis.fetch;
  globalThis.fetch = Object.assign((input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set("Cloudflare-Workers-Version-Overrides", versionOverrides);
    return unrouted(input, { ...init, headers });
  }, unrouted);
}
