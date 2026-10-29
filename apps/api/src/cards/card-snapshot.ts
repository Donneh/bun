import { parseCardSnapshot } from "@riftkeeper/cards/snapshot";
import snapshot from "../../data/cards.json";

export const cards = parseCardSnapshot({ json: snapshot, path: "apps/api/data/cards.json" });
