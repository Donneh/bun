import type { ThemePreference } from "@riftkeeper/ui";
import { browserStorage } from "~/utils/browser-storage";
import { loadThemePreference } from "~/utils/theme-preference";

export function useTheme() {
  return useState<ThemePreference>("theme", () => loadThemePreference(browserStorage));
}
