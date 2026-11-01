import { createApp } from "./app.ts";
import { cards } from "./cards/card-snapshot.ts";
import { priceHistory, prices } from "./cards/price-snapshot.ts";

export default createApp({ cards, prices, priceHistory });
