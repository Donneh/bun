---
name: ship
description: Land a finished Riftkeeper change and prove it is live. Runs bun run check, commits, pushes, opens the PR from a body file, waits for the PR checks (check, infrastructure, web), squash-merges into main, watches the Deploy workflow and its smoke tests, and verifies api.riftkeeper.app and riftkeeper.app. Use when a change is ready to ship, merge, deploy or "land", or after an approved PR, and whenever someone asks to get a change into production. Stops and reports on red checks, a failed deploy or a failed smoke test.
---

# Ship

A change is done when it is live and verified. Run these steps in order. Stop at the first failure and report it with the failing command, its output, and the run or PR URL.

## 1. Check

```sh
git fetch origin
git branch --show-current
bun run check
```

If the current branch is `main`, create a branch first with `git switch -c <name>`. GitHub rejects pushes to `main`.

On Windows, `bun run check` can hang in the test step. If it runs for more than a minute, stop it and run the steps one by one: `bunx biome check`, `bun run typecheck`, `bun run test`, `bun run test:api`, `bun run build`.

Fix Biome formatting with `bunx biome check --write <file>`, then run the check again.

## 2. Commit and push

```sh
git add <paths>
git commit -m "<imperative summary>"
git push -u origin HEAD
```

Never force-push. To bring in `main`, or on any conflict, merge it into the branch, resolve, run step 1 again and push:

```sh
git fetch origin
git merge origin/main
```

## 3. Open the pull request

Write the body to a file with a task-unique name in the scratchpad, never in the repository. Follow the sections of `.github/pull_request_template.md` and fill in every required one, including the evidence. Reference the issue with `Closes #<n>`, or `Refs #<n>` when the PR does not finish it.

```sh
gh pr create --base main --title "<title>" --body-file <body.md>
gh pr view --json url,body -q .url
```

Read the rendered body back with `gh pr view` and fix it with `gh pr edit --body-file <body.md>` if line breaks or backslashes were lost.

If the PR already exists, confirm its base:

```sh
gh pr view --json baseRefName,number,url
```

Never merge a PR whose base is not `main`. Retarget it with `gh pr edit --base main` and wait for checks again.

## 4. Wait for the checks

```sh
gh pr checks --watch --fail-fast
gh pr checks
```

`check` and `infrastructure` (CI) and `web` (E2E) must all pass. Branch protection requires only the first two, so do not use `--required`: it hides `web`. On a failure, read the log and stop:

```sh
gh run view <run-id> --log-failed
```

## 5. Merge

```sh
gh pr view --json baseRefName,mergeable,mergeStateStatus
gh pr merge --squash --delete-branch
gh pr view --json mergeCommit,state -q '.state + " " + .mergeCommit.oid'
```

If `mergeable` is `CONFLICTING`, go back to step 2 and merge `main` into the branch. Keep the merge commit SHA for step 6.

## 6. Watch the deploy

The merge starts the Deploy workflow for that commit. Find its run and watch it:

```sh
gh run list --workflow deploy.yml --commit <merge-sha> --json databaseId,status,conclusion,url
gh run watch <run-id> --exit-status
```

If the run does not show up yet, list it again after the push event registers. Do not rerun or dispatch Deploy yourself.

## 7. Read the smoke tests

```sh
gh run view <run-id>
gh run view <run-id> --log | grep -E "Smoke test the deployed" | grep -E "EXPECTED_|[0-9]+ pass|[0-9]+ fail|passed|failed"
```

Both smoke steps must pass: "Smoke test the deployed API" (`test:api`, prints `N pass` and `0 fail`) and "Smoke test the deployed web app" (`test:production`, prints `N passed`). Note `EXPECTED_VERSION` from the log. On a failure, run `gh run view <run-id> --log-failed`, report it and stop. The screenshots are the `production-smoke-screenshots` artifact on the run.

## 8. Verify live

```sh
curl -s https://api.riftkeeper.app/health
curl -s -o /dev/null -w "%{http_code}\n" https://riftkeeper.app
```

`/health` must answer `status: "ok"`, a card count above zero, and `version` equal to the `EXPECTED_VERSION` from step 7. `https://riftkeeper.app` must answer `200`. Then check the change itself on the live API or page, for example the endpoint or query it changed. After a new custom domain, Cloudflare answers with an empty 404 for about a minute; wait and retry before calling it a failure.

## Report

Reply with the PR URL, the merge SHA, the Deploy run URL, the deployed version from `/health`, and what you checked live. On a stop, name the step, the failing command and its output, and leave the branch and PR as they are.
