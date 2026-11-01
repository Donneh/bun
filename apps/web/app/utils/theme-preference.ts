import { isThemePreference, type ThemePreference } from "@riftkeeper/ui/theme";
import type { StorageAccess } from "./browser-storage.ts";

export const THEME_STORAGE_KEY = "riftkeeper-theme";

export function loadThemePreference(storage: StorageAccess): ThemePreference {
  try {
    const stored = storage().getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function saveThemePreference(storage: StorageAccess, preference: ThemePreference): void {
  try {
    storage().setItem(THEME_STORAGE_KEY, preference);
  } catch {
    return;
  }
}
