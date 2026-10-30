import { describe, expect, test } from "bun:test";
import { loadThemePreference, saveThemePreference, THEME_STORAGE_KEY } from "../app/utils/theme-preference.ts";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

const deniedStorage = (): Storage => {
  throw new DOMException("Storage is disabled", "SecurityError");
};

describe("loadThemePreference", () => {
  test("follows the system without a stored choice", () => {
    expect(loadThemePreference(() => memoryStorage())).toBe("system");
  });

  test("returns the stored choice", () => {
    expect(loadThemePreference(() => memoryStorage({ [THEME_STORAGE_KEY]: "dark" }))).toBe("dark");
  });

  test("ignores an unknown stored value", () => {
    expect(loadThemePreference(() => memoryStorage({ [THEME_STORAGE_KEY]: "sepia" }))).toBe("system");
  });

  test("follows the system when storage is unavailable", () => {
    expect(loadThemePreference(deniedStorage)).toBe("system");
  });
});

describe("saveThemePreference", () => {
  test("stores the choice for the next visit", () => {
    const storage = memoryStorage();

    saveThemePreference(() => storage, "light");

    expect(loadThemePreference(() => storage)).toBe("light");
  });

  test("does not throw when storage is unavailable", () => {
    expect(() => saveThemePreference(deniedStorage, "dark")).not.toThrow();
  });
});
