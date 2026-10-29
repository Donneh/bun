import { describe, expect, test } from "bun:test";
import { cardIdFor } from "./card-identity.ts";

describe("cardIdFor", () => {
  test("joins name and subtitle into a slug", () => {
    expect(String(cardIdFor({ name: "Jinx", subtitle: "Loose Cannon" }))).toBe("jinx-loose-cannon");
  });

  test("slugs a name alone when there is no subtitle", () => {
    expect(String(cardIdFor({ name: "Super Mega Death Rocket!", subtitle: null }))).toBe("super-mega-death-rocket");
  });

  test("collapses punctuation runs and trims dashes", () => {
    expect(String(cardIdFor({ name: "Kai'Sa", subtitle: "  Daughter -- of the Void " }))).toBe(
      "kaisa-daughter-of-the-void",
    );
  });

  test("removes apostrophes instead of splitting on them", () => {
    expect(String(cardIdFor({ name: "Agony's Embrace", subtitle: null }))).toBe("agonys-embrace");
    expect(String(cardIdFor({ name: "Agony’s Embrace", subtitle: null }))).toBe("agonys-embrace");
    expect(String(cardIdFor({ name: "Kai'Sa", subtitle: null }))).toBe("kaisa");
  });
});
