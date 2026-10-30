import type { ThemePreference } from "@riftkeeper/ui";
import { loadThemePreference } from "~/utils/theme-preference";

export const browserStorage = () => window.localStorage;

export function useTheme() {
  return useState<ThemePreference>("theme", () => loadThemePreference(browserStorage));
}
