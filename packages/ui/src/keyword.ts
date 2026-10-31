export type KeywordTone = "teal" | "lime" | "rose" | "slate";

const TONES: Readonly<Record<string, KeywordTone>> = {
  Accelerate: "teal",
  Action: "teal",
  Ambush: "teal",
  Deploy: "teal",
  Flow: "teal",
  Hidden: "teal",
  Legion: "teal",
  "Quick-Draw": "teal",
  Reaction: "teal",
  Repeat: "teal",
  "Show Off": "teal",
  Deathknell: "lime",
  Deflect: "lime",
  Empowered: "lime",
  Ganking: "lime",
  Hunt: "lime",
  Level: "lime",
  Temporary: "lime",
  Assault: "rose",
  Backline: "rose",
  Disarm: "rose",
  Shield: "rose",
  Tank: "rose",
};

const KEYWORDS_WITH_COST = new Set(["Empower", "Equip", "Flow", "Repeat"]);

const baseKeyword = (keyword: string) => keyword.replace(/ \d+$/, "");

export function keywordTone(keyword: string): KeywordTone {
  return TONES[baseKeyword(keyword)] ?? "slate";
}

export function keywordHoldsCost(keyword: string): boolean {
  return KEYWORDS_WITH_COST.has(baseKeyword(keyword));
}
