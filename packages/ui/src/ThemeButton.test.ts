import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import { defineComponent, h, ref } from "vue";
import ThemeButton from "./ThemeButton.vue";
import { applyTheme, type ThemePreference } from "./theme.ts";

function renderButton(initial: ThemePreference) {
  const preference = ref(initial);
  const Host = defineComponent(
    () => () =>
      h(ThemeButton, {
        modelValue: preference.value,
        "onUpdate:modelValue": (value: ThemePreference) => {
          preference.value = value;
        },
      }),
  );
  render(Host);
  return preference;
}

describe("ThemeButton", () => {
  test("names the current mode and shows it as a tooltip", () => {
    renderButton("light");

    const button = screen.getByRole("button", { name: "Theme: light" });
    expect(button.getAttribute("title")).toBe("Theme: light");
  });

  test("cycles system, light, dark and back to system", async () => {
    const preference = renderButton("system");
    const seen: ThemePreference[] = [];

    for (let click = 0; click < 3; click++) {
      await userEvent.click(screen.getByRole("button", { name: /^Theme:/ }));
      seen.push(preference.value);
    }

    expect(seen).toEqual(["light", "dark", "system"]);
    expect(screen.getByRole("button", { name: "Theme: system" })).toBeTruthy();
  });

  test("shows a different icon for each mode", async () => {
    renderButton("system");
    const icons = new Set<string>();

    for (let click = 0; click < 3; click++) {
      icons.add(screen.getByRole("button").querySelector("svg")?.innerHTML ?? "");
      await userEvent.click(screen.getByRole("button"));
    }

    expect(icons.size).toBe(3);
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
