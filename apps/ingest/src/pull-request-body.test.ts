import { describe, expect, test } from "bun:test";
import { renderBlocks } from "./markdown.ts";
import { fitPullRequestBody } from "./pull-request-body.ts";

const detailsBlock = (index: number) =>
  `<details>\n<summary>Group ${index}</summary>\n\n${"- **Card** `card`\n".repeat(20)}\n</details>`;

const blocks = (count: number) => ["**Summary.**", ...Array.from({ length: count }, (_, index) => detailsBlock(index))];

describe("fitPullRequestBody", () => {
  test("returns a report within the limit unchanged", () => {
    const report = blocks(2);

    expect(fitPullRequestBody({ blocks: report, limit: 10_000 })).toBe(renderBlocks(report));
  });

  test("drops whole blocks from the end and appends the notice", () => {
    const report = blocks(100);
    const body = fitPullRequestBody({ blocks: report, limit: 2_000 });

    expect(body.length).toBeLessThanOrEqual(2_000);
    expect(body.startsWith("**Summary.**")).toBe(true);
    expect(body).toContain("Group 0");
    expect(body).not.toContain("Group 99");
    expect(body.trimEnd().endsWith("for the full report.")).toBe(true);
    expect(body.match(/<details>/g)).toHaveLength(body.match(/<\/details>/g)?.length ?? 0);
  });

  test("fits a report larger than GitHub's limit by default", () => {
    const report = blocks(1_000);

    expect(renderBlocks(report).length).toBeGreaterThan(65_536);
    expect(fitPullRequestBody({ blocks: report }).length).toBeLessThanOrEqual(65_536);
  });

  test("keeps only the notice when no block fits", () => {
    const body = fitPullRequestBody({ blocks: [detailsBlock(0)], limit: 400 });

    expect(body).toContain("Report truncated");
    expect(body).not.toContain("<details>");
  });
});
