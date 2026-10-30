# Infrastructure

[OpenTofu](https://opentofu.org) configuration that hosts [`@riftkeeper/api`](../apps/api/README.md), [`@riftkeeper/web`](../apps/web/README.md) and [`@riftkeeper/scheduler`](../apps/scheduler) on Cloudflare Workers. It owns the whole deployment.

The API Worker, `riftkeeper-api` on `hostname`:

| Resource                           | Purpose                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_worker`                | The Worker and its settings. Logs are on and `workers.dev` is off.                                                                    |
| `cloudflare_worker_version`        | The code. It uploads `apps/api/dist/index.js`.                                                                                        |
| `cloudflare_workers_deployment`    | Sends all traffic to the latest version.                                                                                              |
| `cloudflare_workers_custom_domain` | Serves the Worker on `hostname`. Cloudflare creates the DNS record.                                                                   |
| `cloudflare_ruleset`               | Rate limits the API: an IP that sends more than 50 requests in 10 seconds to one data center is blocked with HTTP 429 for 10 seconds. |

The web Worker, `riftkeeper-web` on `web_hostname`. It has no code, only static assets, so a page view never runs a Worker script:

| Resource                           | Purpose                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_worker`                | The Worker and its settings. `workers.dev` is off.                                                                                |
| `cloudflare_worker_version`        | Uploads `apps/web/.output/public`, the output of `nuxt generate`. An unknown path gets `404.html` with status 404.                |
| `cloudflare_workers_deployment`    | Sends all traffic to the latest version.                                                                                          |
| `cloudflare_workers_custom_domain` | Serves the Worker on `web_hostname` and `www.<web_hostname>`. Cloudflare creates the DNS records.                                 |
| `cloudflare_ruleset`               | Redirects `www.<web_hostname>` to `web_hostname` with a 301 that keeps the path and query, before the request reaches the Worker. |

The scheduler Worker, `riftkeeper-scheduler`, has no hostname. It starts the scheduled GitHub workflows, because GitHub's own `schedule:` trigger drops most runs (issue #43):

| Resource                          | Purpose                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `cloudflare_worker`               | The Worker and its settings. Logs are on and `workers.dev` is off.                                                             |
| `cloudflare_worker_version`       | Uploads `apps/scheduler/dist/index.js` with the GitHub token as the `secret_text` binding `GITHUB_DISPATCH_TOKEN`.             |
| `cloudflare_workers_deployment`   | Sends all events to the latest version.                                                                                        |
| `cloudflare_workers_cron_trigger` | Runs the Worker on every cron in `apps/scheduler/schedules.json`. Each event dispatches the workflow that the file maps it to. |

`apps/scheduler/schedules.json` is the one list of schedules. OpenTofu reads its crons for the trigger and the Worker reads it to pick the workflow, so add or change a schedule there and nowhere else. The workflows themselves have only `workflow_dispatch`. A dispatch that GitHub does not answer with 204 throws, so it shows in Workers Observability for `riftkeeper-scheduler` with the status and response body.

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

`.github/workflows/ci.yml` runs on every pull request. It runs `bun run check`, `tofu fmt -check` and `tofu validate`, and it needs no secrets.

`.github/workflows/deploy.yml` runs on every push to `main` and on manual dispatch. It runs the same checks, bundles the API Worker, builds the web app and runs `tofu apply` in the `production` environment. Merging the daily card snapshot pull request therefore deploys the new cards.

After the apply it smoke tests production. `test:api` runs the black-box suite against the API. `test:production` in `apps/web` waits until the page serves the new build, then checks that the page and its scripts and styles load, that a `?q=` link shows search results with one API request, that an unknown path answers 404, and that `www` redirects to the apex.

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

1. Create a new fine-grained token with **Actions** read and write on this repository only.
2. Replace the repository secret `WORKFLOW_DISPATCH_TOKEN` with it.
3. Run the Deploy workflow (`gh workflow run deploy.yml`). The changed secret makes a new scheduler version.
4. Confirm that the next scheduled run of `monitor.yml` starts, with `gh run list --workflow monitor.yml --event workflow_dispatch`, then revoke the old token.

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
