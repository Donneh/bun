import type { RulesSnapshot } from "@riftkeeper/cards/rules";
import snapshot from "../../data/rules.json";

export const rules = snapshot as unknown as RulesSnapshot;
