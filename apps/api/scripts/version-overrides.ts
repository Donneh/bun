const versionOverrides = process.env.VERSION_OVERRIDES;

if (versionOverrides) {
  const unrouted = globalThis.fetch;
  globalThis.fetch = Object.assign(
    (input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
      headers.set("Cloudflare-Workers-Version-Overrides", versionOverrides);
      return unrouted(input, { ...init, headers });
    },
    unrouted,
  );
}
