# Infrastructure

[OpenTofu](https://opentofu.org) configuration that hosts [`@riftkeeper/api`](../apps/api/README.md) on Cloudflare Workers. It owns the whole deployment:

| Resource                           | Purpose                                                             |
| ---------------------------------- | ------------------------------------------------------------------- |
| `cloudflare_worker`                | The Worker and its settings. Logs are on and `workers.dev` is off.  |
| `cloudflare_worker_version`        | The code. It uploads `apps/api/dist/index.js`.                      |
| `cloudflare_workers_deployment`    | Sends all traffic to the latest version.                            |
| `cloudflare_workers_custom_domain` | Serves the Worker on `hostname`. Cloudflare creates the DNS record. |

Do not run `wrangler deploy`. It rewrites the Worker settings that OpenTofu owns. Wrangler stays the tool for `bun run dev` and for bundling.

The Worker name and compatibility date come from `apps/api/wrangler.jsonc`, so local dev and production stay on the same runtime. Keep that file free of comments, because OpenTofu reads it with `jsondecode`.

## State

State lives in the R2 bucket `riftkeeper-tofu-state`, in the EU jurisdiction, under `api.tfstate`, through the `s3` backend with a lock file. CI and every machine share it.

## Setup

Do this once per Cloudflare account:

1. Create the state bucket in the EU jurisdiction: `bunx wrangler r2 bucket create riftkeeper-tofu-state --jurisdiction eu` from `apps/api`, or pick the EU jurisdiction in the dashboard.
2. Create an R2 API token with **Object Read & Write** on that bucket. Keep its access key ID and secret access key.
3. Create a Cloudflare API token with **Workers Scripts Write** on the account and **Workers Routes Write** on the zone. Use these legacy permissions, not the newer Workers roles: the API endpoints that create a Worker and attach a custom domain accept only Workers Scripts Write.

## Deploy from GitHub

`.github/workflows/ci.yml` runs on every pull request. It runs `bun run check`, `tofu fmt -check` and `tofu validate`, and it needs no secrets.

`.github/workflows/deploy.yml` runs on every push to `main` and on manual dispatch. It runs the same checks, bundles the Worker and runs `tofu apply` in the `production` environment. Merging the daily card snapshot pull request therefore deploys the new cards.

Set these on the repository, or on the `production` environment:

| Kind     | Name                    | Value                            |
| -------- | ----------------------- | -------------------------------- |
| Secret   | `CLOUDFLARE_API_TOKEN`  | The Cloudflare API token         |
| Secret   | `R2_ACCESS_KEY_ID`      | The R2 token's access key ID     |
| Secret   | `R2_SECRET_ACCESS_KEY`  | The R2 token's secret access key |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | The account ID                   |
| Variable | `CLOUDFLARE_ZONE_ID`    | The zone ID of the API hostname  |
| Variable | `API_HOSTNAME`          | The public API hostname          |

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
tofu -chdir=infrastructure init
bun run deploy
```

`bun run deploy` bundles the Worker with `wrangler deploy --dry-run` and runs `tofu apply`. A changed bundle has a new hash, so OpenTofu uploads a new version and moves the deployment to it.
