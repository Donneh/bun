import { type Block, renderBlocks } from "./markdown.ts";

export const GITHUB_PULL_REQUEST_BODY_LIMIT = 65_536;

const TRUNCATION_NOTICE: Block =
  "---\n\n**Report truncated** to fit GitHub's pull request body limit. Download the `card-changes` artifact from the workflow run for the full report.";

export function fitPullRequestBody({
  blocks,
  limit = GITHUB_PULL_REQUEST_BODY_LIMIT,
}: {
  blocks: readonly Block[];
  limit?: number;
}): string {
  const whole = renderBlocks(blocks);
  if (whole.length <= limit) return whole;

  const kept: Block[] = [];
  let used = TRUNCATION_NOTICE.length + 1;
  for (const block of blocks) {
    const next = used + block.length + 2;
    if (next > limit) break;
    kept.push(block);
    used = next;
  }
  return renderBlocks([...kept, TRUNCATION_NOTICE]);
}
