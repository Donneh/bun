import { isDeepStrictEqual } from "node:util";
import { parseCardSnapshot, REBUILD_COMMAND } from "@riftkeeper/cards/snapshot";
import snapshot from "../data/cards.json";

const path = "apps/api/data/cards.json";
const cards = parseCardSnapshot({ json: snapshot, path });
if (!isDeepStrictEqual(cards, snapshot)) {
  throw new Error(`Card snapshot ${path} has fields the card schema does not know. Run \`${REBUILD_COMMAND}\`.`);
}
console.log(`Card snapshot ${path} matches the card schema: ${cards.length} cards`);
