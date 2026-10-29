# Riftkeeper

Bun workspaces monorepo for a Riftbound card API. Production is the API on `https://api.riftkeeper.app` and the search page on `https://riftkeeper.app`, two Cloudflare Workers deployed by OpenTofu from GitHub Actions.

- `apps/api` is the Hono API on Cloudflare Workers. Its code in `src` must not use Bun APIs.
- `apps/ingest` is the CLI that scrapes the card gallery into `apps/api/data/cards.json`.
- `apps/web` is the Nuxt search page. It calls the API from the browser; the base URL is the runtime config `public.apiBase` (`NUXT_PUBLIC_API_BASE`), production by default. It is a client-rendered app (`ssr: false`): `bun run build` runs `nuxt generate`, and production serves `.output/public` as static assets of the `riftkeeper-web` Worker. `NUXT_PUBLIC_API_BASE` is read at build time.
- `packages/ui` (`@riftkeeper/ui`) is the Vue component library and the design tokens (CSS custom properties in `src/styles.css`). `apps/web` renders every element with it. Add or extend a component there instead of writing markup or colors in `apps/web`. Components take props and emit events; they never fetch data.
- `packages/cards` holds the card schema shared by both apps.
- `infrastructure/` is the OpenTofu configuration for Cloudflare. See `infrastructure/README.md`.

## Verify

`bun run check` is the gate. Run it before every push. It runs Biome, the type checks (including `vue-tsc` and `nuxt typecheck`), every unit and component test, `test:api`, the Worker build and the Nuxt build.

- `bun run test` runs the unit tests in every workspace, and the Vitest component tests in `packages/ui`.
- `bun run test:e2e` builds `apps/web` against a local API on port 8787, serves the static build with `wrangler dev` the way production serves it, and runs the Playwright test in `apps/web/e2e/`. It records a video and a screenshot per test in `apps/web/test-results/`. Run `bunx playwright install chromium` in `apps/web` once. CI runs it in the E2E workflow and uploads `test-results` as an artifact.
- `bun run dev:web` serves the web app on port 3001 against production. Set `NUXT_PUBLIC_API_BASE=http://localhost:3000` to use the API from `bun run dev`.
- `bun run test:api` starts the Worker in workerd and runs the black-box HTTP tests in `apps/api/test-api/` against it. Set `BASE_URL` to test another server, such as production.
- `tofu -chdir=infrastructure validate` checks the infrastructure. CI also runs `tofu fmt -check -recursive`.

Black-box and end-to-end tests run against the real card snapshot, which changes daily. Assert on shapes and relations between responses, never on specific cards.

`packages/ui` and `apps/web` pin TypeScript 6 because `vue-tsc` needs the TypeScript JavaScript API, which TypeScript 7 does not ship. The other workspaces use TypeScript 7.

On Windows, `bun run check` sometimes hangs in the step that runs every workspace's tests in parallel. If it runs for more than a minute, stop it and run the steps one by one.

## Ship

A change is done when it is live and verified, not when it is merged.

1. Work on a branch. GitHub rejects direct pushes to `main`.
2. Open a pull request. CI runs the `check` and `infrastructure` jobs.
3. Squash-merge when both are green.
4. The merge starts the Deploy workflow: the same checks, `tofu apply`, then `test:api` against the API and `test:production` in `apps/web` against the page. Watch it with `gh run watch`.
5. Confirm the change on `https://api.riftkeeper.app` and `https://riftkeeper.app` yourself. `GET /health` reports the number of loaded cards.

After a new or changed custom domain, Cloudflare answers with an empty, cacheable 404 for about a minute. The smoke test waits for `/health`; a manual check should wait too.

## Rules

- Never run `wrangler deploy`. OpenTofu owns both Workers and their settings, and wrangler would overwrite them. Wrangler is only for `bun run dev`, `wrangler dev` and bundling.
- Write self-documenting code and avoid comments.
- Infrastructure changes go through `infrastructure/` and a pull request, never through the dashboard or the Cloudflare API.

## Ask a human

GitHub secrets and variables and repository settings are changed by a human. Say exactly what to change and why, then wait.

Cloudflare account changes that OpenTofu does not manage, such as API token permissions or DNS records, go through the Cloudflare MCP `execute` tool. Whether an agent may run it without asking depends on the operator's local Claude Code settings; the shared project settings do not grant it.

- The deploy token `riftkeeper-deploy` uses the legacy **Workers Scripts Write** on the account, and **Workers Routes Write**, **Zone Settings Write**, **Zone WAF Write** and **Dynamic URL Redirects Write** (the www redirect rule) on `riftkeeper.app`. The endpoints that create a Worker and attach a custom domain accept only Workers Scripts Write, not the newer Workers roles. A new Cloudflare resource type usually needs a new permission; check the endpoint's `x-api-token-group` with the Cloudflare MCP `search` tool before merging.
- Secrets and variables live on the `production` environment in GitHub.

## Cloudflare

`.mcp.json` adds the Cloudflare API and docs MCP servers. Use them to read the account and search the current docs instead of guessing dashboard labels.

To debug production, query the Worker's logs and traces before guessing: `POST /accounts/{account_id}/workers/observability/telemetry/query` through the Cloudflare MCP `execute` tool, filtered on `$metadata.service` = `riftkeeper-api`. Cloudflare logs every request on its own, with method, path, status, wall and CPU time, outcome and Worker version, so the API has no request logger of its own. Unhandled errors are logged by `onError` in `apps/api/src/app.ts`. Logs and traces are kept for seven days.

The OpenTofu state bucket `riftkeeper-tofu-state` is in R2's EU jurisdiction. The Cloudflare MCP cannot see EU buckets: its bucket list silently shows only the default jurisdiction. List them with `node node_modules/wrangler/bin/wrangler.js r2 bucket list --jurisdiction eu` from `apps/api`.
