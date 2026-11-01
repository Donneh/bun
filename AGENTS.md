# Riftkeeper

Bun workspaces monorepo for a Riftbound card API. Production is the API on `https://api.riftkeeper.app` and the search page on `https://riftkeeper.app`, two Cloudflare Workers deployed by OpenTofu from GitHub Actions. A third Worker, `riftkeeper-scheduler`, starts the scheduled workflows.

- `apps/api` is the Hono API on Cloudflare Workers. Its code in `src` must not use Bun APIs.
- `apps/scheduler` is the `riftkeeper-scheduler` Worker. Its Cron Triggers dispatch `monitor.yml` and `scrape-cards.yml` through the GitHub API, because GitHub's `schedule:` trigger drops runs. `apps/scheduler/schedules.json` maps each cron to its workflow; change schedules there, not in the workflows. The one exception is `scheduler-watchdog.yml`, which runs on GitHub's `schedule:` so that it can alert, through a failing run and an issue, when the scheduler stops dispatching. `bun run test:scheduler` runs the handler in `wrangler dev --test-scheduled` against a fake GitHub.
- `apps/ingest` is the CLI that scrapes the card gallery into `apps/api/data/cards.json` (`bun run scrape`) and fetches TCGplayer prices from TCGCSV into `apps/api/data/prices.json` (`bun run prices`).
- `apps/web` is the Nuxt search page. It calls the API from the browser; the base URL is the runtime config `public.apiBase` (`NUXT_PUBLIC_API_BASE`), production by default. It is a client-rendered app (`ssr: false`): `bun run build` runs `nuxt generate`, and production serves `.output/public` as static assets of the `riftkeeper-web` Worker. `NUXT_PUBLIC_API_BASE` is read at build time.
- `packages/ui` (`@riftkeeper/ui`) is the Vue component library and the design tokens (CSS custom properties in `src/styles.css`). `apps/web` renders every element with it. Add or extend a component there instead of writing markup or colors in `apps/web`. Components take props and emit events; they never fetch data.
- `packages/cards` holds the card schema shared by both apps.
- `infrastructure/` is the OpenTofu configuration for Cloudflare. See `infrastructure/README.md`.

These instructions apply to every coding agent. `CLAUDE.md` imports this file for Claude Code, which also has project tooling in `.claude/`: the `ship` skill, the `reviewer` agent, permission rules and a Biome format hook. Other agents run `bun run format` themselves before committing.

## Verify

`bun run check` is the gate. Run it before every push. It first runs `bun install --frozen-lockfile`, so the installed packages match `bun.lock`, then Biome, the type checks (including `vue-tsc` and `nuxt typecheck`), every unit and component test, `test:api`, `test:scheduler`, the Worker build and the Nuxt build.

- `bun run test` runs the unit tests in every workspace, one workspace after another, and the Vitest component tests in `packages/ui`. Keep it sequential: Bun's parallel `--filter` is suspected of hanging on Windows.
- `bun run test:e2e` builds a copy of `apps/web` in `apps/web/.e2e-copy/` against a local API on port 8787, so it can run next to `bun run check`, serves the static build with `wrangler dev` the way production serves it, and runs the Playwright test in `apps/web/e2e/`. It records a video and a screenshot per test in `apps/web/test-results/`. Run `bunx playwright install chromium` in `apps/web` once. CI runs it in the E2E workflow and uploads `test-results` as an artifact. When another agent may run it too, set `E2E_API_PORT` and `E2E_WEB_PORT` to free ports (defaults 8787 and 3100).
- Screenshot evidence comes from CI, not from your machine. On a pull request from a branch of this repository that changes the web page or the packages it uses, the E2E workflow takes the first screen of `/`, a search, a card page and an unknown path of the built page, at desktop and Pixel 7 size in light and dark, and shows them in one "Screenshots" comment on the pull request that it updates on every push and every edit of the description, with whether the E2E tests passed. The images are deleted when the pull request closes. When the E2E run fails before the screenshots are saved, the comment says so instead. Pull requests from forks get no comment.
- A pull request that changes the UI lists the pages it changes in a `screenshots` block in its description, one path per line, at most six:

  ````
  ```screenshots
  /?q=type:unit c:calm
  /cards/{card}
  /cards/{card: type:legend}
  ```
  ````

  The comment shows those pages too, with the full page as well as the first screen. `/cards/{card}` is the first card of the default search and `/cards/{card: <query>}` the first card of that search, so the block never names a card that may disappear. Only paths on the site are shown; the comment lists every line it ignored and why. A path cannot show a state that needs interaction, such as an open filter or a hover. Problems on these pages are listed in the comment but do not fail the E2E tests. Before you report a UI change as done, wait for that comment, check that the commit it names is the pull request's head (`gh pr view <n> --json headRefOid`), and look at every image, including the pages you listed; link it in your report.
- A change is not done while the browser console shows an error or a warning, in the production build or on the dev server. Every Playwright test imports `test` and `expect` from `apps/web/e2e/browser-console.ts`, which fails the test on any console error or warning, page error or failed request it did not declare with `browserConsole.expect(...)`, and on a declared message that never appeared. Declare messages only in the test that provokes them, such as `failedResponse(500, "/search")`. The one message the app causes on purpose is `unknownCardResponse`: the browser logs the API's 404 for an unknown card, which the card page turns into "Card not found". Fix the cause of any other message; never silence it.
- `bun run test:dev` in `apps/web` runs `apps/web/dev-server/` against `nuxt dev`, where Vue and Nuxt warnings show, through the search page, card pages, and loading and failed states. It takes the same `E2E_API_PORT` and `E2E_WEB_PORT`.
- `bun run verify:live` in `apps/web` checks a deployed site the way a person would, and is the way to confirm a deploy and to produce screenshot evidence; do not write a one-off Playwright script. It takes a base URL (default `https://riftkeeper.app`) and paths (default `/`, a search, a card from that search and an unknown path), and loads each at 1280x900 and on a Pixel 7, in light and dark. It waits until the page has finished loading (at most `--timeout <ms>`, default 30000), prints one line per page with the status and `<h1>`, saves a full-page screenshot and JPEGs of the first screen and the full page in `apps/web/test-results/verify-live/` (or `--out <dir>`) with a `reports.json` of every page, and exits non-zero on a console error or warning, page error, failed request or sideways scroll. `--header "Cloudflare-Workers-Version-Overrides: ..."` checks a staged version. It runs on Node, because Playwright hangs under Bun on Windows. In Git Bash, set `MSYS_NO_PATHCONV=1` so paths such as `/cards/x` are not turned into Windows paths.
- `bun run dev:web` serves the web app on port 3001 against production. Set `NUXT_PUBLIC_API_BASE=http://localhost:3000` to use the API from `bun run dev`.
- `bun run test:api` starts the Worker in workerd and runs the black-box HTTP tests in `apps/api/test-api/` against it. Set `BASE_URL` to test another server, such as production.
- `tofu -chdir=infrastructure validate` checks the infrastructure. CI also runs `tofu fmt -check -recursive`.

Black-box and end-to-end tests run against the real card snapshot, which changes daily. Assert on shapes and relations between responses, never on specific cards.

`packages/ui` and `apps/web` pin TypeScript 6 because `vue-tsc` needs the TypeScript JavaScript API, which TypeScript 7 does not ship. The other workspaces use TypeScript 7.

## Ship

A change is done when it is live and verified, not when it is merged.

1. Work on a branch. GitHub rejects direct pushes to `main`.
2. Open a pull request. CI runs the `check` and `infrastructure` jobs.
3. Squash-merge when both are green.
4. The merge starts the Deploy workflow: the same checks, then `tofu apply` stages the new versions at 0.01% next to the live ones, `test:api` and `test:production` test the staged versions through a version override header, a second `tofu apply` promotes them, and both suites run again. On any failure the workflow moves production back to the versions that were live before the run and fails. See "Release and rollback" in `infrastructure/README.md`. Watch it with `gh run watch`.
   - Find the run by the merge commit, `gh run list --workflow deploy.yml --commit <merge-sha>`, never by taking the latest run: right after the merge the latest is still the previous deploy. The run can take a few seconds to appear; retry for up to two minutes.
   - If no run appears, the merge started no workflow, and its `Closes #N` lines closed nothing. Start the deploy with `gh workflow run deploy.yml --ref main`, find that run by the commit `main` points at, say that you started it, and close the issues the PR names with a comment.
   - If a run fails only in the "Set up job" step of its jobs, such as `Unable to resolve action`, it is a runner fault: rerun it once with `gh run rerun <run-id> --failed`. Any other failure is real; never rerun it.
   - The `ship` skill in `.claude/skills/ship/SKILL.md` has these steps as commands.
5. Confirm the change on `https://api.riftkeeper.app` and `https://riftkeeper.app` yourself. `GET /health` reports the number of loaded cards.

After a new or changed custom domain, Cloudflare answers with an empty, cacheable 404 for about a minute. The smoke test waits for `/health`; a manual check should wait too.

## Rules

- Never run `wrangler deploy`. OpenTofu owns both Workers and their settings, and wrangler would overwrite them. Wrangler is only for `bun run dev`, `wrangler dev` and bundling.
- Write self-documenting code and avoid comments.
- Infrastructure changes go through `infrastructure/` and a pull request, never through the dashboard or the Cloudflare API.
- Base every pull request on `main`, never on another feature branch: GitHub closes a pull request when its base branch is deleted on merge. Force-pushes are denied, so update a branch by merging `main` into it.
- Write GitHub issue, pull request and comment bodies to a file and pass the file (`gh pr create --body-file`, `gh api ... -F body=@file`), never inline through the shell. Then read the rendered result back with `gh pr view` or `gh issue view`.
- Name scratch files after the task or branch, such as `pr-body-<branch>.md`, never a generic name. Parallel agents share the scratchpad directory and overwrite each other's files.
- A `PostToolUse` hook in `.claude/settings.json` runs `biome format --write` on every file an agent writes or edits.

## Ask a human

GitHub secrets and variables and repository settings are changed by a human. Say exactly what to change and why, then wait.

Cloudflare account changes that OpenTofu does not manage, such as API token permissions or DNS records, go through the Cloudflare MCP `execute` tool. Whether an agent may run it without asking depends on the operator's local Claude Code settings; the shared project settings do not grant it.

- The deploy token `riftkeeper-deploy` uses the legacy **Workers Scripts Write** on the account, and **Workers Routes Write**, **Zone Settings Write**, **Zone WAF Write** and **Dynamic URL Redirects Write** (the www redirect rule) on `riftkeeper.app`. The endpoints that create a Worker and attach a custom domain accept only Workers Scripts Write, not the newer Workers roles. A new Cloudflare resource type usually needs a new permission; check the endpoint's `x-api-token-group` with the Cloudflare MCP `search` tool before merging.
- Secrets and variables live on the `production` environment in GitHub.

## Cloudflare

`.mcp.json` adds the Cloudflare API and docs MCP servers. Use them to read the account and search the current docs instead of guessing dashboard labels.

To debug production, query the Worker's logs and traces before guessing: `POST /accounts/{account_id}/workers/observability/telemetry/query` through the Cloudflare MCP `execute` tool, filtered on `$metadata.service` = `riftkeeper-api`. Cloudflare logs every request on its own, with method, path, status, wall and CPU time, outcome and Worker version, so the API has no request logger of its own. Unhandled errors are logged by `onError` in `apps/api/src/app.ts`. Logs and traces are kept for seven days.

The OpenTofu state bucket `riftkeeper-tofu-state` is in R2's EU jurisdiction. The Cloudflare MCP cannot see EU buckets: its bucket list silently shows only the default jurisdiction. List them with `node node_modules/wrangler/bin/wrangler.js r2 bucket list --jurisdiction eu` from `apps/api`.
