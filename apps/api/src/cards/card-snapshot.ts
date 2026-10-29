import type { Card } from "@riftkeeper/cards";
import snapshot from "../../data/cards.json";

export const cards = snapshot as unknown as readonly Card[];
