import type { NavLink } from "@riftkeeper/ui";

const SECTIONS = [
  { label: "Cards", href: "/" },
  { label: "Collection", href: "/collection" },
] as const;

export function useSiteNavigation(currentHref: string | null = "/") {
  const links: NavLink[] = SECTIONS.map((section) => ({ ...section, current: section.href === currentHref }));
  const query = ref("");

  function navigate(href: string) {
    return navigateTo(href);
  }

  function search(text: string) {
    return navigateTo({ path: "/", query: text ? { q: text } : {} });
  }

  return { links, query, navigate, search };
}
