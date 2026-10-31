import type { SavedReport, ViewportName } from "./verify-live.ts";

export type E2eResult = "success" | "failure";

export interface CommentSource {
  readonly reports: readonly SavedReport[];
  readonly imageBaseUrl: string;
  readonly commit: string;
  readonly runUrl: string;
  readonly e2eResult: E2eResult;
}

const VIEWPORT_LABELS: Record<ViewportName, string> = { desktop: "Desktop", "pixel-7": "Pixel 7" };
const E2E_RESULT_SENTENCES: Record<E2eResult, string> = {
  success: "The E2E tests passed.",
  failure: "**The E2E tests failed.**",
};
const IMAGE_WIDTH = 200;
const PROBLEMS_PER_PAGE = 3;
const PROBLEM_LENGTH = 300;

export function isE2eResult(value: string): value is E2eResult {
  return Object.hasOwn(E2E_RESULT_SENTENCES, value);
}

export function pullRequestComment({ reports, imageBaseUrl, commit, runUrl, e2eResult }: CommentSource): string {
  const failed = reports.filter((report) => report.problems.length > 0);
  const summary =
    failed.length === 0
      ? `All ${reports.length} pages passed \`verify:live\`.`
      : `${failed.length} of ${reports.length} pages failed \`verify:live\`.`;
  const paths = [...new Set(reports.map((report) => report.path))];
  return [
    "## Screenshots",
    "",
    `${E2E_RESULT_SENTENCES[e2eResult]} The first screen of each page of the build at ${commit.slice(0, 7)}, served against a local API by the [E2E run](${runUrl}). ${summary} Click an image to enlarge it. The full-page screenshots are in that run's \`e2e-videos-and-screenshots\` artifact, under \`verify-live/\`.`,
    ...paths.flatMap((path) =>
      pathSection(
        path,
        reports.filter((report) => report.path === path),
        imageBaseUrl,
      ),
    ),
    "",
  ].join("\n");
}

function pathSection(path: string, reports: readonly SavedReport[], imageBaseUrl: string): string[] {
  const label = (report: SavedReport) => `${VIEWPORT_LABELS[report.viewport]} ${report.colorScheme}`;
  const image = (report: SavedReport) => {
    const url = `${imageBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(report.firstScreen)}`;
    const alt = escapeHtml(`${decodeURIComponent(path)} ${label(report)}`);
    return `<a href="${url}"><img src="${url}" width="${IMAGE_WIDTH}" alt="${alt}"></a>`;
  };
  const problems = reports.flatMap((report) => problemLines(label(report), report.problems));
  return [
    "",
    `### ${codeSpan(decodeURIComponent(path))}`,
    "",
    `| ${reports.map(label).join(" | ")} |`,
    `| ${reports.map(() => "---").join(" | ")} |`,
    `| ${reports.map(image).join(" | ")} |`,
    ...(problems.length > 0 ? ["", ...problems] : []),
  ];
}

function problemLines(label: string, problems: readonly string[]): string[] {
  const shown = problems.slice(0, PROBLEMS_PER_PAGE).map((problem) => `- ${label}: ${codeSpan(firstLine(problem))}`);
  const hidden = problems.length - PROBLEMS_PER_PAGE;
  return hidden > 0 ? [...shown, `- ${label}: ${hidden} more in the run log`] : shown;
}

function firstLine(text: string): string {
  const line = (text.split("\n")[0] ?? "").trim();
  return line.length > PROBLEM_LENGTH ? `${line.slice(0, PROBLEM_LENGTH)}…` : line;
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
