# @riftkeeper/web

Riftkeeper search page built with [Nuxt](https://nuxt.com). One page with a search bar and a grid of the matching cards. Every element on it comes from [`@riftkeeper/ui`](../../packages/ui/README.md).

## Run

Install from the workspace root (see the [root README](../../README.md)), then run these from `apps/web`:

```sh
bun run dev                                               # http://localhost:3001 against https://api.riftkeeper.app
NUXT_PUBLIC_API_BASE=http://localhost:3000 bun run dev    # against the local API from `bun run dev` at the root
bun run build                                             # production build into .output/
bun run preview                                           # serve the build on http://localhost:3000
```

The API base URL is the runtime config value `public.apiBase`. It defaults to production, and the `NUXT_PUBLIC_API_BASE` environment variable overrides it, also for a built server. The dev server uses port 3001 because the API uses 3000.

The browser calls the API directly, so the API must allow the page's origin. It sends `Access-Control-Allow-Origin: *`.

## The page

- The search bar sends its text as `q` to `GET /search`, so the full query syntax works (see [Search](../api/README.md#search)).
- The query lives in the URL as `?q=`, so a search can be shared and survives a reload. The form also submits `?q=` without JavaScript.
- The grid shows the first 40 results. Each tile shows the image of the card's first matching printing, its name and its subtitle. Landscape cards span two columns.
- Warnings from the response appear under the search bar.
- Without a query the page shows a prompt and does not call the API. It also has loading, no-results and error states.

`app/utils/card-search.ts` calls the API and turns the response into the outcome the page renders. `app/pages/index.vue` maps the URL to a search and the outcome to components.

## End-to-end test

`e2e/search.spec.ts` drives the page in Chromium with [Playwright](https://playwright.dev). It covers the empty page, a query with results (`c:fury cost:<=2`) and a reload of it, a query without results, a query with a warning (`flavor:calm`), the loading and error states, and the shape of landscape cards.

```sh
bunx playwright install chromium   # once
bun run test:e2e                   # nuxt build, then playwright test
```

Playwright starts the API with `wrangler dev` on port 8787 and the built app on port 3100, pointed at that API. The test never calls production. It runs against the real card snapshot, so it asserts relations, such as the result count matching the API's `meta.total`, never specific cards. The error and loading tests change the API response inside the browser with `page.route`.

Every test records a video and a final screenshot in `test-results/`. The E2E workflow uploads that folder as the `e2e-videos-and-screenshots` artifact.

## Check

```sh
bun run typecheck   # nuxt typecheck, including e2e/ and playwright.config.ts
```

`bun run check` at the root runs the type check and the build. The end-to-end test runs in its own CI workflow, `.github/workflows/e2e.yml`, because it needs a browser.
