import { compareStrings } from "./compare-strings.ts";
import { type Block, itemSection, renderBlocks, withHeading } from "./markdown.ts";
import { describeWarning, type ScrapeWarning, type ScrapeWarningKind } from "./scrape-warning.ts";

function groupByKind(warnings: readonly ScrapeWarning[]): Map<ScrapeWarningKind, ScrapeWarning[]> {
  const groups = new Map<ScrapeWarningKind, ScrapeWarning[]>();
  for (const warning of warnings) {
    groups.set(warning.kind, [...(groups.get(warning.kind) ?? []), warning]);
  }
  return groups;
}

export function warningReportBlocks(warnings: readonly ScrapeWarning[]): Block[] {
  const groups = [...groupByKind(warnings)]
    .sort(([left], [right]) => compareStrings(left, right))
    .flatMap(([kind, grouped]) =>
      itemSection({
        heading: `**${kind}** (${grouped.length})`,
        noun: "warning",
        items: grouped.map((warning) => `- ${describeWarning(warning)}`),
      }),
    );
  return withHeading({ heading: `### Scrape warnings (${warnings.length})`, blocks: groups });
}

export function renderWarningReport(warnings: readonly ScrapeWarning[]): string {
  return renderBlocks(warningReportBlocks(warnings));
}
