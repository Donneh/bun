import type { PriceSnapshot } from "@riftkeeper/cards/prices";
import snapshot from "../../data/prices.json";

export const prices = snapshot as unknown as PriceSnapshot;
