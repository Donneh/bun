import { isDeepStrictEqual } from "node:util";
import { parsePriceHistory } from "@riftkeeper/cards/price-history";
import { parsePriceSnapshot } from "@riftkeeper/cards/prices";
import { parseCardSnapshot, REBUILD_COMMAND } from "@riftkeeper/cards/snapshot";
import snapshot from "../data/cards.json";
import priceHistorySnapshot from "../data/price-history.json";
import priceSnapshot from "../data/prices.json";

const path = "apps/api/data/cards.json";
const cards = parseCardSnapshot({ json: snapshot, path });
if (!isDeepStrictEqual(cards, snapshot)) {
  throw new Error(`Card snapshot ${path} has fields the card schema does not know. Run \`${REBUILD_COMMAND}\`.`);
}
console.log(`Card snapshot ${path} matches the card schema: ${cards.length} cards`);

const pricesPath = "apps/api/data/prices.json";
const prices = parsePriceSnapshot({ json: priceSnapshot, path: pricesPath });
if (!isDeepStrictEqual(prices, priceSnapshot)) {
  throw new Error(`Price snapshot ${pricesPath} has fields the price schema does not know.`);
}
console.log(`Price snapshot ${pricesPath} matches the price schema: ${Object.keys(prices.printings).length} printings`);

const historyPath = "apps/api/data/price-history.json";
const history = parsePriceHistory({ json: priceHistorySnapshot, path: historyPath });
if (!isDeepStrictEqual(history, priceHistorySnapshot)) {
  throw new Error(`Price history ${historyPath} has fields the price history schema does not know.`);
}
console.log(`Price history ${historyPath} matches the price history schema: ${history.dates.length} days`);
