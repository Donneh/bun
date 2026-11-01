import {
  MAX_PATH_LENGTH,
  MAX_REQUESTED_PAGES,
  type RejectedLine,
  type RejectionReason,
  type RequestedPaths,
} from "./screenshot-request.ts";
import type { SavedReport, ViewportName } from "./verify-live.ts";

export type E2eResult = "success" | "failure";

export interface CommentSource {
  readonly reports: readonly SavedReport[];
  readonly imageBaseUrl: string;
  readonly commit: string;
  readonly runUrl: string;
  readonly e2eResult: E2eResult;
  readonly requested: RequestedPaths;
}

const VIEWPORT_LABELS: Record<ViewportName, string> = { desktop: "Desktop", "pixel-7": "Pixel 7" };
const E2E_RESULT_SENTENCES: Record<E2eResult, string> = {
  success: "The E2E tests passed.",
  failure: "**The E2E tests failed.**",
};
const REJECTION_SENTENCES: Record<RejectionReason, string> = {
  "not-a-path":
    "it is not a path on this site starting with `/`. States that need interaction, such as an open filter, a hover, or a loading or error state, cannot be shown yet",
  file: "it names a file, not a page",
  "too-long": `it is longer than ${MAX_PATH_LENGTH} characters`,
  unreadable: "it contains control characters or invalid percent-encoding",
  "over-limit": `the block names more than ${MAX_REQUESTED_PAGES} pages`,
  duplicate: "that page is already shown",
  "no-card": "the search found no card",
};
const IMAGE_WIDTH = 200;
const PROBLEMS_PER_PAGE = 3;
const PROBLEM_LENGTH = 300;
const REJECTED_LINES_SHOWN = 5;
const REJECTED_LINE_LENGTH = 100;
const MAX_COMMENT_LENGTH = 60_000;

export function isE2eResult(value: string): value is E2eResult {
  return Object.hasOwn(E2E_RESULT_SENTENCES, value);
}

export function pullRequestComment(source: CommentSource): string {
  const comment = commentWith(source, PROBLEMS_PER_PAGE);
  return comment.length <= MAX_COMMENT_LENGTH ? comment : commentWith(source, 0);
}

function commentWith(
  { reports, imageBaseUrl, commit, runUrl, e2eResult, requested }: CommentSource,
  problemsPerPage: number,
): string {
  const failed = reports.filter((report) => report.problems.length > 0);
  const summary =
    failed.length === 0
      ? `All ${reports.length} pages passed \`verify:live\`.`
      : `${failed.length} of ${reports.length} pages failed \`verify:live\`.`;
  const paths = [...new Set(reports.map((report) => report.path))];
  return [
    "## Screenshots",
    "",
    `${E2E_RESULT_SENTENCES[e2eResult]} The first screen of each page of the build at ${commit.slice(0, 7)}, served against a local API by the [E2E run](${runUrl}). ${summary} ${requestedSentence(requested)}Click an image to enlarge it. The full-size screenshots are in that run's \`e2e-videos-and-screenshots\` artifact, under \`verify-live/\`.`,
    ...rejectedLines(requested.rejected),
    ...paths.flatMap((path) =>
      pathSection(
        path,
        reports.filter((report) => report.path === path),
        imageBaseUrl,
        requested.paths.includes(path),
        problemsPerPage,
      ),
    ),
    "",
  ].join("\n");
}

function requestedSentence({ paths }: RequestedPaths): string {
  if (paths.length === 0) return "";
  const pages =
    paths.length === 1
      ? "The page named in the pull request's `screenshots` block also shows the full page."
      : `The ${paths.length} pages named in the pull request's \`screenshots\` block also show the full page.`;
  return `${pages} `;
}

function rejectedLines(rejected: readonly RejectedLine[]): string[] {
  if (rejected.length === 0) return [];
  const hidden = rejected.length - REJECTED_LINES_SHOWN;
  return [
    "",
    "These lines of the `screenshots` block show no page:",
    "",
    ...rejected
      .slice(0, REJECTED_LINES_SHOWN)
      .map(({ line, reason }) => `- ${codeSpan(displayable(line))}: ${REJECTION_SENTENCES[reason]}.`),
    ...(hidden > 0 ? [`- ${hidden} more`] : []),
  ];
}

function pathSection(
  path: string,
  reports: readonly SavedReport[],
  imageBaseUrl: string,
  showsFullPage: boolean,
  problemsPerPage: number,
): string[] {
  const label = (report: SavedReport) => `${VIEWPORT_LABELS[report.viewport]} ${report.colorScheme}`;
  const image = (file: (report: SavedReport) => string) => (report: SavedReport) => {
    const url = `${imageBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(file(report))}`;
    const alt = escapeHtml(`${decodeURIComponent(path)} ${label(report)}`);
    return `<a href="${url}"><img src="${url}" width="${IMAGE_WIDTH}" alt="${alt}"></a>`;
  };
  const row = (cells: readonly string[]) => `| ${cells.join(" | ")} |`;
  const table = showsFullPage
    ? [
        row(["", ...reports.map(label)]),
        row(["---", ...reports.map(() => "---")]),
        row(["First screen", ...reports.map(image((report) => report.firstScreen))]),
        row(["Full page", ...reports.map(image((report) => report.fullPage))]),
      ]
    : [row(reports.map(label)), row(reports.map(() => "---")), row(reports.map(image((report) => report.firstScreen)))];
  const problems = reports.flatMap((report) => problemLines(label(report), report.problems, problemsPerPage));
  return [
    "",
    `### ${codeSpan(decodeURIComponent(path))}`,
    "",
    ...table,
    ...(problems.length > 0 ? ["", ...problems] : []),
  ];
}

function problemLines(label: string, problems: readonly string[], problemsPerPage: number): string[] {
  const shown = problems.slice(0, problemsPerPage).map((problem) => `- ${label}: ${codeSpan(firstLine(problem))}`);
  const hidden = problems.length - problemsPerPage;
  if (hidden <= 0) return shown;
  const counted = shown.length > 0 ? `${hidden} more` : `${hidden} ${hidden === 1 ? "problem" : "problems"}`;
  return [...shown, `- ${label}: ${counted} in the run log`];
}

function firstLine(text: string): string {
  const line = (text.split("\n")[0] ?? "").trim();
  return line.length > PROBLEM_LENGTH ? `${line.slice(0, PROBLEM_LENGTH)}…` : line;
}

function displayable(text: string): string {
  const visible = text.replace(/\p{C}/gu, "�");
  return visible.length > REJECTED_LINE_LENGTH ? `${visible.slice(0, REJECTED_LINE_LENGTH)}…` : visible;
}

function codeSpan(text: string): string {
  const longestBacktickRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longestBacktickRun + 1);
  const padding = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${padding}${text}${padding}${fence}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
