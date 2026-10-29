import { describe, expect, test } from "bun:test";
import type { Variant } from "@riftkeeper/cards";
import { printingVariant } from "./printing-variant.ts";

const KNOWN_IDS: readonly (readonly [string, Variant])[] = [
  ["ogn-066-298", "standard"],
  ["ogn-066a-298", "alt-art"],
  ["sfd-227-star-221", "signed"],
  ["ven-sp3-006", "special"],
  ["rad-sp1-005", "special"],
  ["unl-t04", "token"],
  ["ven-r04", "rune"],
  ["rad-r1", "rune"],
  ["rad-r1a", "rune"],
];

describe("printingVariant", () => {
  test.each(KNOWN_IDS)("maps %s to %s", (id, variant) => {
    expect(printingVariant(id)).toBe(variant);
  });

  test.each(["", "ogn-066", "OGN-066-298", "ogn-066-298-extra", "ogn-x1-298"])(
    "throws naming the id %p when it matches no pattern",
    (id) => {
      expect(() => printingVariant(id)).toThrow(`Unrecognised printing id pattern: ${id}`);
    },
  );
});
