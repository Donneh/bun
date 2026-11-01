import type { PriceHistory } from "@riftkeeper/cards/price-history";
import type { PriceSnapshot } from "@riftkeeper/cards/prices";
import historySnapshot from "../../data/price-history.json";
import snapshot from "../../data/prices.json";

export const prices = snapshot as unknown as PriceSnapshot;
export const priceHistory = historySnapshot as unknown as PriceHistory;
