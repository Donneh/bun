export const THEME_PREFERENCES = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

const NEXT_PREFERENCE: Record<ThemePreference, ThemePreference> = { system: "light", light: "dark", dark: "system" };

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.some((preference) => preference === value);
}

export function nextThemePreference(preference: ThemePreference): ThemePreference {
  return NEXT_PREFERENCE[preference];
}

export function applyTheme(preference: ThemePreference, root: HTMLElement = document.documentElement): void {
  if (preference === "system") delete root.dataset.theme;
  else root.dataset.theme = preference;
}
