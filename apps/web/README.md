# @riftkeeper/web

Riftkeeper search page built with [Nuxt](https://nuxt.com), live on [riftkeeper.app](https://riftkeeper.app). One page with a search bar and a grid of the matching cards. Every element on it comes from [`@riftkeeper/ui`](../../packages/ui/README.md).

## Run

Install from the workspace root (see the [root README](../../README.md)), then run these from `apps/web`:

```sh
bun run dev                                               # http://localhost:3001 against https://api.riftkeeper.app
NUXT_PUBLIC_API_BASE=http://localhost:3000 bun run dev    # against the local API from `bun run dev` at the root
bun run build                                             # static build into .output/public
bun run preview                                           # serve the build on http://localhost:3002 the way production does
```

The API base URL is the runtime config value `public.apiBase`. It defaults to production, and the `NUXT_PUBLIC_API_BASE` environment variable overrides it. A build reads it at build time, because the build is static. The dev server uses port 3001 because the API uses 3000.

## Deploy

The page renders in the browser (`ssr: false`), and `bun run build` runs `nuxt generate`. Every query lives in `?q=`, which a prerendered page cannot know, so server rendering would only show the empty state before the browser replaced it. Production serves `.output/public` as the static assets of the `riftkeeper-web` Worker on `riftkeeper.app`, and `www.riftkeeper.app` redirects there. A page view never runs Worker code. `wrangler.jsonc` holds the Worker name, the asset directory and the not-found handling, which OpenTofu reads (see [Infrastructure](../../infrastructure/README.md)). Never run `wrangler deploy`.

The Deploy workflow runs `bun run test:production` after each apply. It waits until `BASE_URL` serves the build with `EXPECTED_BUILD_ID`, then checks that the page and its scripts and styles load, that a `?q=` link shows search results, that an unknown path answers 404, and that `WWW_URL` redirects to `BASE_URL` with the path and query. Its page view makes two API requests, a search and `/health`, far under the rate limit. The Monitor workflow runs the same suite against `https://riftkeeper.app` on a schedule without `EXPECTED_BUILD_ID`, so it accepts any build that serves the app.

```sh
BASE_URL=https://riftkeeper.app WWW_URL=https://www.riftkeeper.app bun run test:production
```

The browser calls the API directly, so the API must allow the page's origin. It sends `Access-Control-Allow-Origin: *`.

## The page

- The search bar sends its text as `q` to `GET /search`, so the full query syntax works (see [Search](../api/README.md#search)).
- The query lives in the URL as `?q=`, so a search can be shared and survives a reload. The form also submits `?q=` without JavaScript.
- The grid shows the first 40 results. Scrolling to within 800px of the end loads the next page of 40 by itself, and the summary says how many of the total are shown. Screen readers hear the new count. At most one page request is in flight, page requests start at least 600ms apart so fast scrolling cannot burst past the API rate limit, and loading stops once every card is shown. A failed page shows the error with a **Try again** button in place of the scroll trigger. A page that arrives for an older query or sort is dropped. Each tile shows the image of the card's first matching printing, its name and its subtitle. Landscape cards span two columns.
- The sort control sets `sort` and `direction`. Both live in the URL next to `q`, left out when they are the defaults (`set`, `asc`). The page number never goes in the URL, so a shared link opens the first page in the same order.
- The response's `parsed.filters` appear as chips under the search bar, each with its label and value. Removing an editable chip cuts exactly its `span` (UTF-16 offsets) out of `parsed.query`, with the `and` that joined it, and searches again. Chips that are not editable, such as a filter that appears twice, have no remove button. When `hasAdvancedConditions` is set, a muted note says the query holds more than the chips.
- Warnings from the response appear under the search bar.
- Without a query the page shows a prompt and does not search. It also has loading, no-results and error states. While a search loads, the grid shows dithered placeholder tiles, and while the next page loads it appends placeholders at its end.
- The hero's eyebrow shows the number of cards from `GET /health`. If that request fails, the eyebrow leaves the number out.
- The theme button at the top right, on the eyebrow line, cycles system, light and dark. The choice is stored in `localStorage` under `riftkeeper-theme`. When the browser blocks storage, the button still works for the visit.

`app/utils/card-search.ts` calls the API and turns the response into the outcome the page renders. `app/utils/theme-preference.ts` reads and stores the theme choice. `app/utils/search-state.ts` reads and writes the URL state, and `app/utils/filter-chips.ts` turns `parsed.filters` into chips and removes a chip's span from the query. `app/pages/index.vue` maps the URL to a search and the outcome to components.

## End-to-end test

`e2e/search.spec.ts` drives the page in Chromium with [Playwright](https://playwright.dev). It covers the empty page and its card count, the page fitting the screen without sideways scrolling, 44px tap targets on a phone, the corner dither keeping clear of the eyebrow, search bar and theme button, the theme button cycle and its stored choice, a browser that blocks storage, a query with results (`c:fury cost:<=2`) and a reload of it, a query without results, a query with a warning (`flavor:calm`), the loading and error states, the shape of landscape cards, infinite scroll through all results of `c:fury cost:<=2` with placeholders while a page loads, a failed page and its retry, sorting, removing a filter chip, a chip that cannot be removed, and a shared link with a sort.

```sh
bunx playwright install chromium   # once
bun run test:e2e                   # playwright test, which builds the app first
```

Every test runs twice: in desktop Chromium (`chromium`) and at a phone viewport with touch (`mobile`, the Pixel 7 profile).

Playwright starts the API with `wrangler dev` on port 8787. It then runs `nuxt generate` with `NUXT_PUBLIC_API_BASE` pointed at that API, and serves the build with `wrangler dev` on port 3100, so the test exercises the same static assets and not-found handling as production. `E2E_API_PORT` and `E2E_WEB_PORT` override the two ports, so two checkouts can run the test at the same time:

```sh
E2E_API_PORT=8797 E2E_WEB_PORT=3197 bun run test:e2e
```

Outside CI, Playwright reuses an API that already listens on the API port, so a second run on the default ports would test against the other checkout's API. The test never calls production. It runs against the real card snapshot, so it asserts relations, such as the result count matching the API's `meta.total`, never specific cards. The error and loading tests change the API response inside the browser with `page.route`.

Every test records a video and a final screenshot in `test-results/`. The E2E workflow uploads that folder as the `e2e-videos-and-screenshots` artifact.

## Check

```sh
bun run typecheck   # nuxt typecheck, including e2e/, production/ and the Playwright configs
```

`bun run check` at the root runs the type check and the build. The end-to-end test runs in its own CI workflow, `.github/workflows/e2e.yml`, because it needs a browser.
