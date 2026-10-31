import type { SavedReport, ViewportName } from "./verify-live.ts";

export interface CommentSource {
  readonly reports: readonly SavedReport[];
  readonly imageBaseUrl: string;
  readonly commit: string;
  readonly runUrl: string;
}

const VIEWPORT_LABELS: Record<ViewportName, string> = { desktop: "Desktop", "pixel-7": "Pixel 7" };
const IMAGE_WIDTH = 200;
const PROBLEMS_PER_PAGE = 3;
const PROBLEM_LENGTH = 300;

export function pullRequestComment({ reports, imageBaseUrl, commit, runUrl }: CommentSource): string {
  const failed = reports.filter((report) => report.problems.length > 0);
  const summary =
    failed.length === 0
      ? `All ${reports.length} pages passed \`verify:live\`.`
      : `${failed.length} of ${reports.length} pages failed \`verify:live\`.`;
  const paths = [...new Set(reports.map((report) => report.path))];
  return [
    "## Screenshots",
    "",
    `The first screen of each page of the build at ${commit.slice(0, 7)}, served against a local API by the [E2E run](${runUrl}). ${summary} Click an image to enlarge it. The full-page screenshots are in that run's \`e2e-videos-and-screenshots\` artifact, under \`verify-live/\`.`,
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
    `### \`${decodeURIComponent(path)}\``,
    "",
    `| ${reports.map(label).join(" | ")} |`,
    `| ${reports.map(() => "---").join(" | ")} |`,
    `| ${reports.map(image).join(" | ")} |`,
    ...(problems.length > 0 ? ["", ...problems] : []),
  ];
}

function problemLines(label: string, problems: readonly string[]): string[] {
  const shown = problems.slice(0, PROBLEMS_PER_PAGE).map((problem) => `- ${label}: ${inlineCode(problem)}`);
  const hidden = problems.length - PROBLEMS_PER_PAGE;
  return hidden > 0 ? [...shown, `- ${label}: ${hidden} more in the run log`] : shown;
}

function inlineCode(text: string): string {
  const firstLine = (text.split("\n")[0] ?? "").trim();
  const clipped = firstLine.length > PROBLEM_LENGTH ? `${firstLine.slice(0, PROBLEM_LENGTH)}…` : firstLine;
  return `<code>${escapeHtml(clipped)}</code>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
