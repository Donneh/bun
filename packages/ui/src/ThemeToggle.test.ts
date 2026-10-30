import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import { defineComponent, h, ref } from "vue";
import ThemeToggle from "./ThemeToggle.vue";
import { applyTheme } from "./theme.ts";

function renderToggle(initial: "system" | "light" | "dark") {
  const preference = ref(initial);
  const Host = defineComponent(
    () => () =>
      h(ThemeToggle, {
        modelValue: preference.value,
        "onUpdate:modelValue": (value: "system" | "light" | "dark") => {
          preference.value = value;
        },
      }),
  );
  render(Host);
  return preference;
}

const option = (name: string) => within(screen.getByRole("group", { name: "Theme" })).getByRole("button", { name });

describe("ThemeToggle", () => {
  test("offers system, light and dark and marks the current choice", () => {
    renderToggle("light");

    expect(option("System").getAttribute("aria-pressed")).toBe("false");
    expect(option("Light").getAttribute("aria-pressed")).toBe("true");
    expect(option("Dark").getAttribute("aria-pressed")).toBe("false");
  });

  test("reports the new choice when the user picks one", async () => {
    const preference = renderToggle("system");

    await userEvent.click(option("Dark"));

    expect(preference.value).toBe("dark");
    expect(option("Dark").getAttribute("aria-pressed")).toBe("true");
  });
});

describe("applyTheme", () => {
  test("sets an explicit theme on the root and removes it for the system theme", () => {
    const root = document.createElement("html");

    applyTheme("dark", root);
    expect(root.dataset.theme).toBe("dark");

    applyTheme("system", root);
    expect(root.hasAttribute("data-theme")).toBe(false);
  });
});
