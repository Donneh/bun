import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardRulesNotes from "./CardRulesNotes.vue";
import type { RulesNote } from "./card-detail.ts";

const faq = { label: "Vendetta Rules FAQ and Clarifications", href: "https://playriftbound.com/en-us/news/faq" };
const errata = { label: "Radiance Errata Updates", href: "https://playriftbound.com/en-us/news/errata" };
const notes: RulesNote[] = [
  {
    kind: "errata",
    date: "Oct 9, 2026",
    current: "Give a friendly unit +3 :rb_might: this turn.",
    previous: "Give another friendly unit +3 :rb_might: this turn.",
    source: errata,
  },
  {
    kind: "ruling",
    date: "Aug 14, 2026",
    question: [{ kind: "text", text: "Does it work on itself?" }],
    answer: [
      [
        { kind: "text", text: "Yes, it gets +3 " },
        { kind: "glyph", name: "might" },
        { kind: "text", text: "." },
      ],
      [{ kind: "text", text: "Relevant Rules: 419" }],
    ],
    source: faq,
  },
];

describe("CardRulesNotes", () => {
  test("lists each note with its date, its source link and its text, and names the glyphs", () => {
    render(CardRulesNotes, { props: { notes } });

    const [first, second] = within(screen.getByRole("region", { name: "Rules notes" })).getAllByRole("listitem");
    expect(first?.textContent).toContain("Oct 9, 2026");
    expect(first?.textContent).toContain("Give a friendly unit");
    expect(first?.textContent).toContain("Give another friendly unit");
    expect(
      within(first as HTMLElement)
        .getByRole("link", { name: errata.label })
        .getAttribute("href"),
    ).toBe(errata.href);
    expect(second?.textContent).toContain("Does it work on itself?");
    expect(second?.textContent).toContain("Relevant Rules: 419");
    expect(within(second as HTMLElement).getByRole("img", { name: "Might" })).toBeTruthy();
  });
});

describe("long FAQ answers", () => {
  const long = (lines: string[]): RulesNote => ({
    kind: "ruling",
    date: "Aug 14, 2026",
    question: [{ kind: "text", text: "A long question?" }],
    answer: lines.map((text) => [{ kind: "text", text }]),
    source: faq,
  });

  test("show their first paragraph and expand to the rest on request", async () => {
    render(CardRulesNotes, { props: { notes: [long(["Short answer first.", "x".repeat(400)])] } });

    expect(screen.getByText("Short answer first.")).toBeTruthy();
    const rest = screen.getByText("x".repeat(400));
    const button = screen.getByRole("button", { name: "Show full answer" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(rest.closest("div")?.style.display).toBe("none");

    await userEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.textContent?.trim()).toBe("Show less");
    expect(rest.closest("div")?.style.display).toBe("");
  });

  test("stay open when the answer is short or has one paragraph", () => {
    render(CardRulesNotes, { props: { notes: [long(["One", "Two"]), long(["y".repeat(900)])] } });

    expect(screen.queryByRole("button")).toBeNull();
  });
});
