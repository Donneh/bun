export type Domain = "fury" | "calm" | "mind" | "body" | "chaos" | "order" | "colorless";

export interface DomainScope {
  readonly "data-rk-domain": Domain;
  readonly style: Readonly<Record<"--rk-color-domain" | "--rk-color-domain-second", string>>;
}

const domainColor = (domain: Domain) => `var(--rk-color-domain-${domain})`;

export function domainScope(domains: readonly Domain[]): DomainScope {
  const [first = "colorless", second = first] = domains;
  return {
    "data-rk-domain": first,
    style: { "--rk-color-domain": domainColor(first), "--rk-color-domain-second": domainColor(second) },
  };
}
