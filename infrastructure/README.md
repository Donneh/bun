# Infrastructure

[OpenTofu](https://opentofu.org) configuration that hosts [`@riftkeeper/api`](../apps/api/README.md) and [`@riftkeeper/web`](../apps/web/README.md) on Cloudflare Workers. It owns the whole deployment.

The API Worker, `riftkeeper-api` on `hostname`:

| Resource                           | Purpose                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_worker`                | The Worker and its settings. Logs are on and `workers.dev` is off.                                                                    |
| `cloudflare_worker_version`        | The code. It uploads `apps/api/dist/index.js`.                                                                                        |
| `cloudflare_workers_deployment`    | Splits traffic between the live and the new version. See [Release and rollback](#release-and-rollback).                               |
| `cloudflare_workers_custom_domain` | Serves the Worker on `hostname`. Cloudflare creates the DNS record.                                                                   |
| `cloudflare_ruleset`               | Rate limits the API: an IP that sends more than 50 requests in 10 seconds to one data center is blocked with HTTP 429 for 10 seconds. |

The web Worker, `riftkeeper-web` on `web_hostname`. It has no code, only static assets, so a page view never runs a Worker script:

| Resource                           | Purpose                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_worker`                | The Worker and its settings. `workers.dev` is off.                                                                                |
| `cloudflare_worker_version`        | Uploads `apps/web/.output/public`, the output of `nuxt generate`. An unknown path gets `404.html` with status 404.                |
| `cloudflare_workers_deployment`    | Splits traffic between the live and the new version. See [Release and rollback](#release-and-rollback).                           |
| `cloudflare_workers_custom_domain` | Serves the Worker on `web_hostname` and `www.<web_hostname>`. Cloudflare creates the DNS records.                                 |
| `cloudflare_ruleset`               | Redirects `www.<web_hostname>` to `web_hostname` with a 301 that keeps the path and query, before the request reaches the Worker. |

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

The smoke tests are `test:api` and `test:production`. `test:api` waits until `/health` reports the expected version, then runs the black-box suite against the API. `test:production` in `apps/web` waits until the page serves the new build, then checks that the page and its scripts and styles load, that a `?q=` link shows search results and that the API the page searched reports `EXPECTED_API_VERSION` on `/health`, that an unknown path answers 404, and that `www` redirects to the apex.

Set these on the repository, or on the `production` environment:

| Kind     | Name                    | Value                                      |
| -------- | ----------------------- | ------------------------------------------ |
| Secret   | `CLOUDFLARE_API_TOKEN`  | The Cloudflare API token                   |
| Secret   | `R2_ACCESS_KEY_ID`      | The R2 token's access key ID               |
| Secret   | `R2_SECRET_ACCESS_KEY`  | The R2 token's secret access key           |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | The account ID                             |
| Variable | `CLOUDFLARE_ZONE_ID`    | The zone ID of both hostnames              |
| Variable | `API_HOSTNAME`          | The public API hostname                    |
| Variable | `WEB_HOSTNAME`          | The public web app hostname, without `www` |

## Release and rollback

A deploy never sends users to a version that has not passed the smoke tests, and a failed deploy leaves production on the versions that served it before. The Deploy workflow releases both Workers in these steps:

1. **Read the live versions.** `live-versions.ts` reads `tofu show -json` and prints the version that serves most traffic for each Worker, such as `{"riftkeeper-api":"<id>","riftkeeper-web":"<id>"}`. It skips deposed deployments. It fails when either Worker has no live version, because the stage would then send all traffic to that Worker's new version untested. See [First deploy](#first-deploy).
2. **Stage.** `tofu apply` with `TF_VAR_live_versions` set to that map. OpenTofu uploads the new versions. Each `deployment` module keeps the live version at 99.99% and gives the new version 0.01%. The provider rejects 0%, so 0.01% is the smallest share. A Worker whose version did not change stays at 100%.
3. **Smoke test the staged versions.** Both test suites send the `Cloudflare-Workers-Version-Overrides` header from the `version_overrides` output, so their requests reach the new versions while users stay on the live ones. `test:api` reads it from `VERSION_OVERRIDES` through `apps/api/scripts/version-overrides.ts`, and `test:production` sets it as a Playwright header. The page test therefore runs the new page against the new API, and it checks that the API the page searched reports the new version. Cloudflare ignores an override for a version that is not in the deployment, so the tests wait for the expected version and fail if they never see it.
4. **Promote.** `tofu apply` without `live_versions` moves all traffic to the new versions. The step fails if this apply released other versions than the ones the smoke tests passed for (`worker_version_id` and `web_version_id`).
5. **Smoke test again** without the header, the way users reach production.
6. **Roll back** if any step from staging onward fails or the run is cancelled. The workflow runs `tofu apply` with the live versions from step 1 and `TF_VAR_rollback=true`, which sends all traffic of each Worker to its live version and none to the new one, and marks the run failed with a `Rolled back` error. It retries the apply once. If both attempts fail, it reports a `Rollback failed` error with the live versions and this run's versions; then run the same apply by hand.

The state always matches what Cloudflare serves: every traffic change is a `tofu apply`. After a rollback, the failed version gets no traffic. The next deploy reads the live versions from the state again, so it stages next to the version that served traffic, not next to the failed one.

Every apply waits up to 60 seconds for the state lock (`-lock-timeout=60s`), so a rollback does not fail on a lock that a cancelled apply has not released yet.

Staging covers the Worker versions only. The stage apply applies every other change in `infrastructure/` in full, such as a Worker setting, a custom domain or a ruleset, and the rollback does not undo it.

`create_before_destroy` on the deployment keeps the old deployment in the state when Cloudflare rejects a new one. Without it, OpenTofu would drop the deployment from the state first, and the next deploy would not know the live version.

### First deploy

The very first deploy, with an empty state, has no live versions, so the read step fails. Run the Deploy workflow by hand with **bootstrap** checked, or `gh workflow run deploy.yml -f bootstrap=true`. A Worker without a live version then gets all traffic at once, and the rollback has nothing to return it to. The workflow refuses `bootstrap` together with `break_api`.

### Exercise the rollback

Run the Deploy workflow by hand with **Stage an API that answers 503** checked, or with `gh workflow run deploy.yml -f break_api=true`. It replaces the API bundle with one that answers 503 to every request and stages it. The API smoke test waits three minutes for the staged version to report itself on `/health`, then fails. The rollback step runs and the run fails with the `Rolled back` error. Throughout, `https://api.riftkeeper.app/health` reports the version that was live before the run, and the next regular deploy replaces the broken version.

### Reach a version by hand

```sh
curl -s https://api.riftkeeper.app/health -H 'Cloudflare-Workers-Version-Overrides: riftkeeper-api="<version id>"'
```

The version must be part of the current deployment. Otherwise Cloudflare ignores the header and serves the live version.

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
tofu -chdir=infrastructure init
bun run deploy
```

`bun run deploy` bundles the API Worker with `wrangler deploy --dry-run`, builds the web app with `nuxt generate` and runs `tofu apply`. A changed bundle or asset directory has a new hash, so OpenTofu uploads a new version and moves the deployment to it. Every web build has a new Nuxt build ID, so every deploy uploads a new web version.

`bun run deploy` does not stage or roll back: it sends all traffic to the new versions at once. Prefer the Deploy workflow.
