import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import CardInfo from "./CardInfo.vue";
import type { CardInfoContent } from "./card-detail.ts";

const ahri: CardInfoContent = {
  name: "Ahri",
  subtitle: "Inquisitive",
  kicker: [
    [
      { kind: "glyph", name: "rune_mind", decorative: true },
      { kind: "text", text: "Mind" },
    ],
    [
      { kind: "glyph", name: "card_type_unit", decorative: true },
      { kind: "text", text: "Champion Unit" },
    ],
  ],
  stats: [
    { label: "Energy", value: "3", glyph: "energy_3", valueShown: false },
    { label: "Might", value: "3", glyph: "might", valueShown: true },
  ],
  rules: ["When I attack, give an enemy unit -2 :rb_might:.", "[Ganking]"],
  tags: [{ label: "Ionia", href: "/?q=t%3AIonia" }],
  artist: "Six More Vodka",
};

const printing = { setName: "Origins", orientation: "portrait" as const };
const printings = [
  { ...printing, id: "ogn-119", code: "OGN-119/298", details: ["Standard"], imageUrl: "https://e.com/1.png" },
  { ...printing, id: "ogn-119a", code: "OGN-119a/298", details: ["Alt art"], imageUrl: "https://e.com/2.png" },
];

const renderInfo = (card: CardInfoContent = ahri) =>
  render(CardInfo, { props: { card, printings, selected: "ogn-119" } });

describe("CardInfo", () => {
  test("shows the name as the page heading with the domain and type above it and the subtitle below", () => {
    renderInfo();

    const heading = screen.getByRole("heading", { level: 1, name: "Ahri" });
    expect(screen.getByText("Inquisitive")).toBeTruthy();
    const kicker = screen.getByText("Champion Unit").closest("p");
    expect(kicker?.textContent).toContain("Mind");
    expect((kicker?.compareDocumentPosition(heading) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("names every stat and its value, also when the glyph alone shows the value", () => {
    const { container } = renderInfo();

    const terms = [...container.querySelectorAll("dt")].map((term) => term.textContent);
    const values = [...container.querySelectorAll("dd")].map((value) => value.textContent?.trim());
    expect(terms).toEqual(["Energy", "Might"]);
    expect(values).toEqual(["3", "3"]);
  });

  test("leaves out the stat row, tags and credit when the card has none", () => {
    const { container } = renderInfo({ ...ahri, stats: [], tags: [], artist: null });

    expect(container.querySelector("dl")).toBeNull();
    expect(container.querySelector("footer")).toBeNull();
  });

  test("shows the ability and the effect as rules text", () => {
    renderInfo();

    expect(screen.getByText(/When I attack/)).toBeTruthy();
    expect(screen.getByText("Ganking")).toBeTruthy();
  });

  test("lists the printings and reports the one a reader chooses", async () => {
    const { emitted } = renderInfo();

    const list = screen.getByRole("list", { name: "Printings" });
    expect(within(list).getByRole("button", { pressed: true }).textContent).toContain("OGN-119/298");
    await userEvent.click(within(list).getByRole("button", { name: /OGN-119a/ }));

    expect(emitted("select")).toEqual([["ogn-119a"]]);
  });

  test("links each tag to its search and credits the artist", async () => {
    const { emitted } = renderInfo();

    const tag = within(screen.getByRole("list", { name: "Tags" })).getByRole("link", { name: "Ionia" });
    expect(tag.getAttribute("href")).toBe("/?q=t%3AIonia");
    expect(screen.getByText("Illustrated by Six More Vodka")).toBeTruthy();

    await fireEvent.click(tag, { ctrlKey: true });
    await userEvent.click(tag);
    expect(emitted("navigate")).toEqual([["/?q=t%3AIonia"]]);
  });
});
