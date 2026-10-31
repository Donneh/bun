import { createApp } from "./app.ts";
import { cards } from "./cards/card-snapshot.ts";
import { prices } from "./cards/price-snapshot.ts";

export default createApp({ cards, prices });
