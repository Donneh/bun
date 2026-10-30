# Riftkeeper

Bun workspaces monorepo for a Riftbound card API. Production is the API on `https://api.riftkeeper.app` and the search page on `https://riftkeeper.app`, two Cloudflare Workers deployed by OpenTofu from GitHub Actions. A third Worker, `riftkeeper-scheduler`, starts the scheduled workflows.

- `apps/api` is the Hono API on Cloudflare Workers. Its code in `src` must not use Bun APIs.
- `apps/scheduler` is the `riftkeeper-scheduler` Worker. Its Cron Triggers dispatch `monitor.yml` and `scrape-cards.yml` through the GitHub API, because GitHub's `schedule:` trigger drops runs. `apps/scheduler/schedules.json` maps each cron to its workflow; change schedules there, not in the workflows. `bun run test:scheduler` runs the handler in `wrangler dev --test-scheduled` against a fake GitHub.
- `apps/ingest` is the CLI that scrapes the card gallery into `apps/api/data/cards.json`.
- `apps/web` is the Nuxt search page. It calls the API from the browser; the base URL is the runtime config `public.apiBase` (`NUXT_PUBLIC_API_BASE`), production by default. It is a client-rendered app (`ssr: false`): `bun run build` runs `nuxt generate`, and production serves `.output/public` as static assets of the `riftkeeper-web` Worker. `NUXT_PUBLIC_API_BASE` is read at build time.
- `packages/ui` (`@riftkeeper/ui`) is the Vue component library and the design tokens (CSS custom properties in `src/styles.css`). `apps/web` renders every element with it. Add or extend a component there instead of writing markup or colors in `apps/web`. Components take props and emit events; they never fetch data.
- `packages/cards` holds the card schema shared by both apps.
- `infrastructure/` is the OpenTofu configuration for Cloudflare. See `infrastructure/README.md`.

These instructions apply to every coding agent. `CLAUDE.md` imports this file for Claude Code, which also has project tooling in `.claude/`: the `ship` skill, the `reviewer` agent, permission rules and a Biome format hook. Other agents run `bun run format` themselves before committing.

## Verify

`bun run check` is the gate. Run it before every push. It runs Biome, the type checks (including `vue-tsc` and `nuxt typecheck`), every unit and component test, `test:api`, the Worker build and the Nuxt build.

- `bun run test` runs the unit tests in every workspace, one workspace after another, and the Vitest component tests in `packages/ui`. Keep it sequential: Bun's parallel `--filter` is suspected of hanging on Windows.
- `bun run test:e2e` builds `apps/web` against a local API on port 8787, serves the static build with `wrangler dev` the way production serves it, and runs the Playwright test in `apps/web/e2e/`. It records a video and a screenshot per test in `apps/web/test-results/`. Run `bunx playwright install chromium` in `apps/web` once. CI runs it in the E2E workflow and uploads `test-results` as an artifact. When another agent may run it too, set `E2E_API_PORT` and `E2E_WEB_PORT` to free ports (defaults 8787 and 3100).
- A change is not done while the browser console shows an error or a warning, in the production build or on the dev server. Every Playwright test imports `test` and `expect` from `apps/web/e2e/browser-console.ts`, which fails the test on any console error or warning, page error or failed request it did not declare with `browserConsole.expect(...)`, and on a declared message that never appeared. Declare messages only in the test that provokes them, such as `failedResponse(500, "/search")`. The one message the app causes on purpose is `unknownCardResponse`: the browser logs the API's 404 for an unknown card, which the card page turns into "Card not found". Fix the cause of any other message; never silence it.
- `bun run test:dev` in `apps/web` runs `apps/web/dev-server/` against `nuxt dev`, where Vue and Nuxt warnings show, through the search page, card pages, and loading and failed states. It takes the same `E2E_API_PORT` and `E2E_WEB_PORT`.
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
