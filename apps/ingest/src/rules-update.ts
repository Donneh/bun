import type { RulesSnapshot } from "@riftkeeper/cards/rules";

function identity(entry: { source: string } & Record<string, unknown>): string {
  return JSON.stringify([entry.source, entry.card, entry.format, entry.question]);
}

export function rulesUpdate({
  previous,
  next,
  warnings,
  excludedSources,
}: {
  previous: RulesSnapshot | null;
  next: RulesSnapshot;
  warnings: readonly string[];
  excludedSources: Readonly<Record<string, string>>;
}): { changed: boolean; autoMerge: boolean } {
  let edited = false;
  if (previous !== null)
    for (const key of ["bans", "errata", "rulings"] as const) {
      const entries = new Map(next[key].map((entry) => [identity(entry), entry]));
      for (const entry of previous[key]) {
        const replacement = entries.get(identity(entry));
        if (replacement === undefined && excludedSources[entry.source] === undefined)
          throw new Error(
            `Refusing to remove a known ${key} entry: ${identity(entry)}. Review the source and update the snapshot explicitly.`,
          );
        if (JSON.stringify(entry) !== JSON.stringify(replacement)) edited = true;
      }
    }
  return {
    changed: JSON.stringify(previous) !== JSON.stringify(next),
    autoMerge:
      previous !== null &&
      !edited &&
      warnings.length === 0 &&
      JSON.stringify(previous.rulings) === JSON.stringify(next.rulings),
  };
}
