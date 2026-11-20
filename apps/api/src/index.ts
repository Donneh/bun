import { createApp } from "./app.ts";
import { cards } from "./cards/card-snapshot.ts";
import { priceHistory, prices } from "./cards/price-snapshot.ts";
import { rules } from "./cards/rules-snapshot.ts";

export default createApp({ cards, prices, priceHistory, rules });
