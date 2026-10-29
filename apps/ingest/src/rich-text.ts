const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const TOKEN = /(<[^>]*>)/;
const TAG = /^<(\/?)([a-z0-9]+)\s*\/?>$/i;

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    }
    if (body.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    }
    const decoded = NAMED_ENTITIES[body.toLowerCase()];
    if (decoded === undefined) {
      throw new Error(`Unsupported HTML entity in rich text: ${entity}`);
    }
    return decoded;
  });
}

function startLine(output: string): string {
  return output === "" || output.endsWith("\n") ? output : `${output}\n`;
}

function applyTag({ output, closing, name }: { output: string; closing: boolean; name: string }): string {
  switch (name) {
    case "p":
    case "ul":
      return startLine(output);
    case "li":
      return closing ? startLine(output) : `${startLine(output)}- `;
    case "br":
      return `${output}\n`;
    default:
      throw new Error(`Unsupported HTML tag in rich text: <${closing ? "/" : ""}${name}>`);
  }
}

export function richTextToPlainText(html: string): string {
  let output = "";
  for (const part of html.split(TOKEN)) {
    const tag = TAG.exec(part);
    if (tag) {
      output = applyTag({ output, closing: tag[1] === "/", name: (tag[2] ?? "").toLowerCase() });
    } else if (part.startsWith("<")) {
      throw new Error(`Malformed HTML tag in rich text: ${part}`);
    } else {
      output += decodeEntities(part);
    }
  }
  return output
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}
