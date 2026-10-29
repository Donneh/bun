import { describe, expect, test } from "bun:test";
import { richTextToPlainText } from "./rich-text.ts";

describe("richTextToPlainText", () => {
  test("turns a paragraph into its text", () => {
    expect(richTextToPlainText("<p>Draw 1.</p>")).toBe("Draw 1.");
  });

  test("turns br into newlines and keeps keywords and tokens verbatim", () => {
    const html =
      "<p>[Reaction] (Play any time, even before spells and abilities resolve.)<br />Pay :rb_energy_2: and :rb_rune_fury:.<br />[Predict].</p>";
    expect(richTextToPlainText(html)).toBe(
      "[Reaction] (Play any time, even before spells and abilities resolve.)\nPay :rb_energy_2: and :rb_rune_fury:.\n[Predict].",
    );
  });

  test("prefixes list items with a dash on their own lines", () => {
    const html = "<p>Choose one —</p><ul><li>Ready 2 runes.</li><li>Channel 1 rune exhausted.</li></ul>";
    expect(richTextToPlainText(html)).toBe("Choose one —\n- Ready 2 runes.\n- Channel 1 rune exhausted.");
  });

  test("separates consecutive paragraphs with a newline", () => {
    expect(richTextToPlainText("<p>First.</p><p>Second.</p>")).toBe("First.\nSecond.");
  });

  test("decodes entities without treating decoded markup as tags", () => {
    const html = "<p>[Empowered][&gt;] I have &quot;+1&quot; &amp; &lt;p&gt; &#39;x&#39; &#x41;.</p>";
    expect(richTextToPlainText(html)).toBe("[Empowered][>] I have \"+1\" & <p> 'x' A.");
  });

  test("returns an empty string for empty markup", () => {
    expect(richTextToPlainText("<p></p>")).toBe("");
  });

  test("rejects tags it does not know", () => {
    expect(() => richTextToPlainText("<p><b>Bold</b></p>")).toThrow("<b>");
  });

  test("rejects entities it does not know", () => {
    expect(() => richTextToPlainText("<p>&bogus;</p>")).toThrow("&bogus;");
  });
});
