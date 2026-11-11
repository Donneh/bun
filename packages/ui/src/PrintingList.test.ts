import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/vue";
import { describe, expect, test } from "vitest";
import PrintingList from "./PrintingList.vue";

const printings = [
  {
    id: "ogn-119-298",
    setName: "Origins",
    code: "OGN-119/298",
    details: ["Standard", "Epic", "Six More Vodka"],
    imageUrl: "https://example.com/ogn-119.png",
    orientation: "portrait" as const,
    prices: [
      { label: "Normal", amount: "$0.25" },
      { label: "Foil", amount: "$1.10" },
    ],
  },
  {
    id: "ogn-119a-298",
    setName: "Origins",
    code: "OGN-119a/298",
    details: ["Alt art", "Showcase"],
    imageUrl: "https://example.com/ogn-119a.png",
    orientation: "landscape" as const,
    prices: [],
  },
];

describe("PrintingList", () => {
  test("lists each printing with its set, code and details under a heading", () => {
    render(PrintingList, { props: { printings, selected: "ogn-119-298" } });

    const list = screen.getByRole("list", { name: "Printings" });
    const buttons = within(list).getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.textContent).toContain("OGN-119/298");
    expect(buttons[0]?.textContent).toContain("Standard · Epic · Six More Vodka");
    expect(screen.getByRole("heading", { level: 2, name: "Printings" })).toBeTruthy();
  });

  test("shows the market price of each finish a printing has, and no price for one without", () => {
    render(PrintingList, { props: { printings, selected: "ogn-119-298" } });

    const [priced, unpriced] = screen.getAllByRole("button");
    expect(priced?.textContent).toContain("Normal $0.25");
    expect(priced?.textContent).toContain("Foil $1.10");
    expect(unpriced?.textContent).not.toContain("$");
  });

  test("shows a decorative thumbnail of each printing", () => {
    const { container } = render(PrintingList, { props: { printings, selected: "ogn-119-298" } });

    const thumbnails = [...container.querySelectorAll("img")];
    expect(thumbnails.map((image) => image.getAttribute("src"))).toEqual(
      printings.map((printing) => printing.imageUrl),
    );
    expect(thumbnails.every((image) => image.getAttribute("alt") === "")).toBe(true);
    expect(thumbnails.map((image) => image.classList.contains("landscape"))).toEqual([false, true]);
  });

  test("marks the selected printing as pressed", () => {
    render(PrintingList, { props: { printings, selected: "ogn-119a-298" } });

    expect(screen.getByRole("button", { pressed: true }).textContent).toContain("OGN-119a/298");
  });

  test("reports the printing a reader chooses", async () => {
    const { emitted } = render(PrintingList, { props: { printings, selected: "ogn-119-298" } });

    await userEvent.click(screen.getByRole("button", { name: /OGN-119a\/298/ }));

    expect(emitted("select")).toEqual([["ogn-119a-298"]]);
  });
});
