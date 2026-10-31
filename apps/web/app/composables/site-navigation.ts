import type { NavLink } from "@riftkeeper/ui";

export function useSiteNavigation(currentHref: string | null = "/") {
  const links: NavLink[] = [{ label: "Cards", href: "/", current: currentHref === "/" }];
  const query = ref("");

  function navigate(href: string) {
    return navigateTo(href);
  }

  function search(text: string) {
    return navigateTo({ path: "/", query: text ? { q: text } : {} });
  }

  return { links, query, navigate, search };
}
