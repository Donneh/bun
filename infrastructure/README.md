# Infrastructure

[OpenTofu](https://opentofu.org) configuration that hosts [`@riftkeeper/api`](../apps/api/README.md), [`@riftkeeper/web`](../apps/web/README.md) and [`@riftkeeper/scheduler`](../apps/scheduler) on Cloudflare Workers. It owns the whole deployment.

The API Worker, `riftkeeper-api` on `hostname`:

| Resource                           | Purpose                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_worker`                | The Worker and its settings. Logs are on and `workers.dev` is off.                                                                    |
| `cloudflare_worker_version`        | The code. It uploads `apps/api/dist/index.js`.                                                                                        |
| `cloudflare_workers_deployment`    | Splits traffic between the live and the new version. See [Release and rollback](#release-and-rollback).                               |
| `cloudflare_workers_custom_domain` | Serves the Worker on `hostname`. Cloudflare creates the DNS record.                                                                   |
| `cloudflare_ruleset`               | Rate limits the API: an IP that sends more than 50 requests in 10 seconds to one data center is blocked with HTTP 429 for 10 seconds. |

The web Worker, `riftkeeper-web` on `web_hostname`. It has no code, only static assets, so a page view never runs a Worker script:

| Resource                           | Purpose                                                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cloudflare_worker`                | The Worker and its settings. `workers.dev` is off and Preview URLs on `workers.dev` are on, for [Previews](#previews).                                                   |
| `cloudflare_worker_version`        | Uploads `apps/web/.output/public`, the output of `nuxt generate`. An unknown path gets `index.html` with status 200, so the app routes deep links such as `/cards/<id>`. |
| `cloudflare_workers_deployment`    | Splits traffic between the live and the new version. See [Release and rollback](#release-and-rollback).                                                                  |
| `cloudflare_workers_custom_domain` | Serves the Worker on `web_hostname` and `www.<web_hostname>`. Cloudflare creates the DNS records.                                                                        |
| `cloudflare_ruleset`               | Redirects `www.<web_hostname>` to `web_hostname` with a 301 that keeps the path and query, before the request reaches the Worker.                                        |

The scheduler Worker, `riftkeeper-scheduler`, has no hostname. It starts the scheduled GitHub workflows, because GitHub's own `schedule:` trigger drops most runs (issue #43):

| Resource                          | Purpose                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `cloudflare_worker`               | The Worker and its settings. Logs are on and `workers.dev` is off.                                                             |
| `cloudflare_worker_version`       | Uploads `apps/scheduler/dist/index.js` with the GitHub token as the `secret_text` binding `GITHUB_DISPATCH_TOKEN`.             |
| `cloudflare_workers_deployment`   | Sends all events to the latest version.                                                                                        |
| `cloudflare_workers_cron_trigger` | Runs the Worker on every cron in `apps/scheduler/schedules.json`. Each event dispatches the workflow that the file maps it to. |

`apps/scheduler/schedules.json` is the one list of schedules. OpenTofu reads its crons for the trigger and the Worker reads it to pick the workflow, so add or change a schedule there and nowhere else. The workflows themselves have only `workflow_dispatch`. A dispatch that GitHub answers with a 5xx, or that fails on the network, is retried after 2 and again after 20 seconds. Any other answer than 204, or a third failure, throws, so it shows in Workers Observability for `riftkeeper-scheduler` with the status and response body. A successful dispatch logs when the token expires, from GitHub's `github-authentication-token-expiration` header. Nobody watches those logs, so the [scheduler watchdog](#scheduler-watchdog) alerts when dispatches stop.

The scheduler deploys at 100% on every apply. A cron event cannot carry a version override, so a staged version would never be tested before it runs.

For the whole zone, `cloudflare_zone_setting` turns on Always Use HTTPS, so `http://` requests redirect to `https://`.

Do not run `wrangler deploy`. It rewrites the Worker settings that OpenTofu owns. Wrangler stays the tool for `bun run dev`, `wrangler dev` and bundling.

Each Worker's name and compatibility date come from its app's `wrangler.jsonc`, so local dev and production stay on the same runtime. The web Worker also takes its asset directory and not-found handling from `apps/web/wrangler.jsonc`, so `wrangler dev` in the end-to-end test serves the build the way production does. Keep both files free of comments, because OpenTofu reads them with `jsondecode`.

## State

State lives in the R2 bucket `riftkeeper-tofu-state`, in the EU jurisdiction, under `api.tfstate`, through the `s3` backend with a lock file. CI and every machine share it.

## Setup

Do this once per Cloudflare account:

1. Create the state bucket in the EU jurisdiction: `bunx wrangler r2 bucket create riftkeeper-tofu-state --jurisdiction eu` from `apps/api`, or pick the EU jurisdiction in the dashboard.
2. Create an R2 API token with **Object Read & Write** on that bucket. Keep its access key ID and secret access key.
3. Create a Cloudflare API token with **Workers Scripts Write** on the account, and **Workers Routes Write**, **Zone Settings Write**, **Zone WAF Write** and **Dynamic URL Redirects Write** on the zone. Use these legacy permissions, not the newer Workers roles: the API endpoints that create a Worker and attach a custom domain accept only Workers Scripts Write.
4. Delete any DNS record on `web_hostname` or `www.<web_hostname>`, such as a registrar parking record. A Workers custom domain cannot take a hostname that already has a record.

## Deploy from GitHub

`.github/workflows/ci.yml` runs on every pull request. It runs `bun run check`, `tofu fmt -check`, `tofu validate` and the `tofu test` of the `deployment` module, and it needs no secrets.

`.github/workflows/deploy.yml` runs on every push to `main` and on manual dispatch. Its `deploy` job runs only on `main`, so a dispatch from another branch runs the checks and deploys nothing. It runs the same checks, bundles the API Worker, builds the web app and releases both Workers in the `production` environment, as [Release and rollback](#release-and-rollback) describes. Merging the daily card snapshot pull request therefore deploys the new cards.

The smoke tests are `test:api` and `test:production`. `test:api` waits until `/health` reports the expected version, then runs the black-box suite against the API. `test:production` in `apps/web` waits until the page serves the new build, then checks that the page and its scripts and styles load, that a `?q=` link shows search results and that the API the page searched reports `EXPECTED_API_VERSION` on `/health`, that a card page opened directly by its URL and an unknown path both serve that build and render in the browser, and that `www` redirects to the apex.

Set these on the repository, or on the `production` environment:

| Kind     | Name                      | Value                                                                          |
| -------- | ------------------------- | ------------------------------------------------------------------------------ |
| Secret   | `CLOUDFLARE_API_TOKEN`    | The Cloudflare API token                                                       |
| Secret   | `R2_ACCESS_KEY_ID`        | The R2 token's access key ID                                                   |
| Secret   | `R2_SECRET_ACCESS_KEY`    | The R2 token's secret access key                                               |
| Variable | `CLOUDFLARE_ACCOUNT_ID`   | The account ID                                                                 |
| Variable | `CLOUDFLARE_ZONE_ID`      | The zone ID of both hostnames                                                  |
| Variable | `API_HOSTNAME`            | The public API hostname                                                        |
| Variable | `WEB_HOSTNAME`            | The public web app hostname, without `www`                                     |
| Secret   | `WORKFLOW_DISPATCH_TOKEN` | A fine-grained GitHub token with **Actions** read and write on this repository |

The deploy passes `WORKFLOW_DISPATCH_TOKEN` to OpenTofu as the sensitive variable `github_dispatch_token`. OpenTofu keeps it out of its output, but it stores the value in plain text in the state file in the private R2 bucket, like every Worker secret it manages. Anyone who can read the state bucket can read the token.

### Rotate the GitHub dispatch token

The current `WORKFLOW_DISPATCH_TOKEN` was stored on 2026-10-30. Its expiry date is not recorded yet: read it from the scheduler's `Dispatched ... the token expires ...` log line, or from the token's page in GitHub's developer settings, and write it here. Rotate the token before that date; the [scheduler watchdog](#scheduler-watchdog) opens an issue within about an hour if it expires anyway.

1. Create a new fine-grained token with **Actions** read and write on this repository only.
2. Replace the repository secret `WORKFLOW_DISPATCH_TOKEN` with it.
3. Run the Deploy workflow (`gh workflow run deploy.yml`). The changed secret makes a new scheduler version.
4. Confirm that the next scheduled run of `monitor.yml` starts, with `gh run list --workflow monitor.yml --event workflow_dispatch`, then revoke the old token.
5. Write the new token's expiry date above.

### Scheduler watchdog

Nobody watches Workers Observability, so `.github/workflows/scheduler-watchdog.yml` checks from GitHub that the scheduler still dispatches. It is the one workflow on GitHub's own `schedule:` trigger, at minutes 11 and 41, because it must not depend on the scheduler it watches. GitHub drops some of its runs, which only delays an alert. `apps/scheduler/scripts/watchdog.ts` looks up the latest `workflow_dispatch` run of every workflow in `apps/scheduler/schedules.json` and fails when one is older than its maximum age in `apps/scheduler/src/watchdog.ts`: 60 minutes for `monitor.yml`, 26 hours for `scrape-cards.yml`. A unit test fails when a scheduled workflow has no maximum age.

When the check fails, the run fails, which GitHub emails to the person who last changed the watchdog's cron, and it opens the issue **Scheduler stopped dispatching workflows**, or comments on it when it is already open. The issue lists each late workflow with its latest run and where to look for the cause. The first run that finds every workflow on time comments on the issue and closes it.

The watchdog uses the workflow's own `GITHUB_TOKEN` (`actions: read`, `issues: write`), not the dispatch token. It keeps working when the dispatch token expires, and it does not depend on the scheduler's credential: it checks that runs start, not how they were started.

It counts every `workflow_dispatch` run, so a run started by hand resets the clock and can delay an alert by up to one maximum age. The scheduler's dispatches and a person's look the same while the scheduler uses the owner's personal token. Once it dispatches as a GitHub App (#77), the watchdog can count only runs whose triggering actor is the app.

## Release and rollback

Until a new API or web version passes the smoke tests, it receives at most 0.01% of user traffic (the lowest share the provider accepts), and a failed deploy sends all traffic back to the versions that served it before. The Deploy workflow releases both Workers in these steps:

1. **Read the live versions.** `live-versions.ts` reads `tofu show -json` and prints the version that serves most traffic for each Worker, such as `{"riftkeeper-api":"<id>","riftkeeper-web":"<id>"}`. It skips deposed deployments. It fails when either Worker has no live version, because the stage would then send all traffic to that Worker's new version untested. See [First deploy](#first-deploy).
2. **Stage.** `tofu apply` with `TF_VAR_live_versions` set to that map. OpenTofu uploads the new versions. Each `deployment` module keeps the live version at 99.99% and gives the new version 0.01%. The provider rejects 0%, so 0.01% is the smallest share. A Worker whose version did not change stays at 100%.
3. **Smoke test the staged versions.** Both test suites send the `Cloudflare-Workers-Version-Overrides` header from the `version_overrides` output, so their requests reach the new versions while users stay on the live ones. `test:api` reads it from `VERSION_OVERRIDES` through `apps/api/scripts/version-overrides.ts`, and `test:production` sets it as a Playwright header. The page test therefore runs the new page against the new API, and it checks that the API the page searched reports the new version. Cloudflare ignores an override for a version that is not in the deployment, so the tests wait for the expected version and fail if they never see it.
4. **Promote.** `tofu apply` without `live_versions` moves all traffic to the new versions. The step fails if this apply released other versions than the ones the smoke tests passed for (`worker_version_id` and `web_version_id`).
5. **Smoke test again** without the header, the way users reach production.
6. **Roll back** if any step from staging onward fails or the run is cancelled. The workflow runs `tofu apply` with the live versions from step 1 and `TF_VAR_rollback=true`, which sends all traffic of each Worker to its live version and none to the new one, and marks the run failed with a `Rolled back` error. It retries the apply once. If both attempts fail, it reports a `Rollback failed` error with the live versions and this run's versions; then run the same apply by hand.

The state always matches what Cloudflare serves: every traffic change is a `tofu apply`. After a rollback, the failed version gets no traffic. The next deploy reads the live versions from the state again, so it stages next to the version that served traffic, not next to the failed one.

Every apply waits up to 60 seconds for the state lock (`-lock-timeout=60s`), so a rollback does not fail on a lock that a cancelled apply has not released yet.

Staging covers the API and web Worker versions only. The scheduler Worker deploys at 100% at the stage apply, because a cron event cannot carry a version override, and a rollback does not move it. The stage apply applies every other change in `infrastructure/` in full, such as a Worker setting, a custom domain or a ruleset, and the rollback does not undo it.

`create_before_destroy` on the deployment keeps the old deployment in the state when Cloudflare rejects a new one. Without it, OpenTofu would drop the deployment from the state first, and the next deploy would not know the live version.

### Monitor during a deploy

The Monitor workflow (`.github/workflows/monitor.yml`) tests production every 15 minutes. Its first job pipes `gh run list --workflow deploy.yml --branch main` into `monitor-target.ts`, which decides what to test:

- **A Deploy run is in progress and started less than 30 minutes ago.** Monitor skips its tests, succeeds and says so in its summary with a link to the Deploy run. The Deploy run tests production itself and rolls back on failure. After 30 minutes Monitor tests again, so a stuck Deploy run cannot hide an outage for longer than that.
- **Otherwise** Monitor checks out the commit of the Deploy run on `main` that succeeded last, the commit that production runs, and runs that commit's `test:api` and `test:production`. A test merged for behavior that is not live yet, or that a failed deploy rolled back, therefore does not fail Monitor. If no recent Deploy run succeeded, it tests the commit it was dispatched on and warns.

A Deploy run that starts while Monitor is already testing does not skip it. Such a run stages at 0.01% about one minute after it starts and promotes about two minutes after it starts, while Monitor's tests take under a minute. Monitor has therefore almost always finished before the promotion, and at 0.01% almost none of its requests reach the staged version.

Monitor can also pick an older commit than the live one in two rare cases:

- `bun run deploy` from a machine leaves no Deploy run, so Monitor tests the commit of the last Deploy run.
- `gh run list` shows only the latest attempt of a run. When a re-run of the live commit's Deploy run fails, the rollback keeps that commit live, but its run now reads `failure`, so Monitor tests the commit of the successful Deploy run before it. Run the Deploy workflow again to fix it.

### First deploy

The very first deploy, with an empty state, has no live versions, so the read step fails. Run the Deploy workflow by hand with **bootstrap** checked, or `gh workflow run deploy.yml -f bootstrap=true`. A Worker without a live version then gets all traffic at once, and the rollback has nothing to return it to. The workflow refuses `bootstrap` together with `break_api`.

### Exercise the rollback

Run the Deploy workflow by hand with **Stage an API that answers 503** checked, or with `gh workflow run deploy.yml -f break_api=true`. It replaces the API bundle with one that answers 503 to every request and stages it. The API smoke test waits three minutes for the staged version to report itself on `/health`, then fails. The rollback step runs and the run fails with the `Rolled back` error. Throughout, `https://api.riftkeeper.app/health` reports the version that was live before the run, and the next regular deploy replaces the broken version.

### Reach a version by hand

```sh
curl -s https://api.riftkeeper.app/health -H 'Cloudflare-Workers-Version-Overrides: riftkeeper-api="<version id>"'
```

The version must be part of the current deployment. Otherwise Cloudflare ignores the header and serves the live version.

## Previews

`.github/workflows/preview.yml` gives every pull request from a branch of this repository a [Worker Preview](https://developers.cloudflare.com/workers/previews/) of the web app, so the change can be tried on a phone before it is merged:

1. It builds `apps/web` against the production API, with a "Preview" bar that links the pull request, a `robots: noindex` meta tag and a `_headers` file that sends `X-Robots-Tag: noindex`.
2. `wrangler preview --name pr-<number>` creates or updates the Preview `pr-<number>` of `riftkeeper-web`. Its URL stays the same across pushes.
3. `verify:live` checks the Preview URL in a browser, and a `curl` checks the `noindex` header.
4. It posts or updates one "Preview" comment with the link, and sets it as the `preview` environment's URL.
5. When the pull request closes, the `cleanup` job deletes the Preview and says so in the comment. Cloudflare keeps at most 100 Previews per Worker on the free plan and deletes the least recently deployed one beyond that.

A Preview is not a Worker version and not a deployment: `wrangler preview` only calls the `/workers/workers/riftkeeper-web/previews` endpoints and the assets upload. Production traffic, the live deployment and the version list do not change, and OpenTofu sees no drift. Check it with `GET https://api.riftkeeper.app/health` and the version list of `riftkeeper-web` before and after a Preview.

Only the web app gets a Preview. Its API is production, so an API change shows in a Preview only after it is deployed.

Turning on Preview URLs (`subdomain.previews_enabled` on `cloudflare_worker.web`) also serves every uploaded `riftkeeper-web` version on `<version prefix>-riftkeeper-web.<subdomain>.workers.dev`. Those versions hold only the public static page, so that exposes nothing new. The API and scheduler Workers keep Preview URLs off.

### Set up previews

The owner does this once. Until then the Preview workflow skips with a notice.

1. Create a Cloudflare API token `riftkeeper-preview` with only **Workers Scripts Write** on the account. A separate token keeps the zone permissions of `riftkeeper-deploy` out of pull request jobs and can be revoked on its own. It can still upload and deploy Workers, so keep pull requests from forks out: the workflow already skips them, and GitHub does not give their runs secrets.
2. Make sure the account has a `workers.dev` subdomain: it shows on the **Workers & Pages** overview in the dashboard, or in `GET /accounts/{account_id}/workers/subdomain`. Preview URLs are `<preview>-riftkeeper-web.<subdomain>.workers.dev`.
3. In GitHub, create the environment `preview` and add the secret `CLOUDFLARE_API_TOKEN` (the new token) and the variable `CLOUDFLARE_ACCOUNT_ID`.
4. Merge the pull request that turns on `previews_enabled`, and let the Deploy workflow apply it. Rerun the Preview workflow on an open pull request to get its link.

## Deploy from your machine

Export the same values, then run `bun run deploy` from the workspace root:

```sh
export CLOUDFLARE_API_TOKEN=<api token>
export AWS_ACCESS_KEY_ID=<r2 access key id>
export AWS_SECRET_ACCESS_KEY=<r2 secret access key>
export AWS_ENDPOINT_URL_S3=https://<account id>.eu.r2.cloudflarestorage.com
export TF_VAR_account_id=<account id>
export TF_VAR_zone_id=<zone id>
export TF_VAR_hostname=api.example.com
export TF_VAR_web_hostname=example.com
export TF_VAR_github_dispatch_token=<github token>
tofu -chdir=infrastructure init
bun run deploy
```

`bun run deploy` bundles the API and scheduler Workers with `wrangler deploy --dry-run`, builds the web app with `nuxt generate` and runs `tofu apply`. A changed bundle or asset directory has a new hash, so OpenTofu uploads a new version and moves the deployment to it. Every web build has a new Nuxt build ID, so every deploy uploads a new web version.

`bun run deploy` does not stage or roll back: it sends all traffic to the new versions at once. Prefer the Deploy workflow.
