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

On Windows, `bun run check` can hang in the test step. If it runs for more than a minute, stop it and run the steps one by one: `bun install --frozen-lockfile`, `bunx biome check`, `bun run typecheck`, `bun run test`, `bun run test:api`, `bun run test:scheduler`, `bun run build`.

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
gh pr view <pr> --json baseRefName,mergeable,mergeStateStatus
gh pr merge <pr> --squash --delete-branch
gh pr view <pr> --json mergeCommit,state -q '.state + " " + .mergeCommit.oid'
```

If `mergeable` is `CONFLICTING`, go back to step 2 and merge `main` into the branch. Keep the PR number and the merge commit SHA for step 6. Pass the PR number from here on: `--delete-branch` switches the checkout to `main`, where `gh pr view` without a number finds no PR.

## 6. Watch the deploy

Shell variables do not survive between tool calls, so each block below starts by setting what it needs. Replace `<pr>`, `<merge-sha>` and `<run-id>`. The lookups wait up to two minutes and a deploy takes about three, longer than the default two-minute Bash tool timeout: run each block in this step with a timeout of 600000 ms.

### Find the run by the merge commit

Find the Deploy run by the merge commit's SHA. Never take the latest run (`gh run list --limit 1`): right after the merge it is still the previous deploy, and watching it reports a success for a change that was not deployed. The push event can take a few seconds to register, so wait up to two minutes:

```bash
SHA=<merge-sha>
for attempt in $(seq 12); do
  RUN_ID=$(gh run list --workflow deploy.yml --commit "$SHA" --limit 1 --json databaseId -q '.[0].databaseId')
  [ -n "$RUN_ID" ] && break
  sleep 10
done
echo "Deploy run for $SHA: ${RUN_ID:-none}"
```

### Start the deploy when the merge started none

Sometimes a merge starts no workflow at all, and the PR's `Closes` lines close nothing. If the lookup printed `none`, start Deploy on `main` and find the new run by the commit `main` points at:

```bash
SHA=<merge-sha>
gh workflow run deploy.yml --ref main
git fetch origin main
git merge-base --is-ancestor "$SHA" origin/main || { echo "$SHA is not on origin/main"; exit 1; }
MAIN_SHA=$(git rev-parse origin/main)
for attempt in $(seq 12); do
  RUN_ID=$(gh run list --workflow deploy.yml --commit "$MAIN_SHA" --limit 1 --json databaseId -q '.[0].databaseId')
  [ -n "$RUN_ID" ] && break
  sleep 10
done
echo "Deploy run for $MAIN_SHA: ${RUN_ID:-none}"
```

If `main` moved past the merge commit, the run for the newer commit deploys this change too. Say in the report that you started the deploy yourself. If this lookup also prints `none`, stop and report.

Then check that the issues named in the PR's `Closes` lines are closed, and close any that are not:

```bash
PR=<pr>
SHA=<merge-sha>
for issue in $(gh pr view "$PR" --json closingIssuesReferences -q '.closingIssuesReferences[].number'); do
  STATE=$(gh issue view "$issue" --json state -q .state)
  echo "#$issue $STATE"
  if [ "$STATE" != CLOSED ]; then
    BODY_FILE="<scratchpad>/close-issue-$issue-pr-$PR.md"
    printf 'Closed by #%s (%s). The merge did not close it automatically.\n' "$PR" "$SHA" > "$BODY_FILE" &&
      gh issue comment "$issue" --body-file "$BODY_FILE" &&
      gh issue close "$issue" --reason completed
  fi
done
```

Replace `<scratchpad>` with the session's scratchpad directory, or another directory outside the repository.

### Watch it, and retry a runner setup failure once

```bash
gh run watch <run-id> --exit-status
```

If the run fails, check whether every failed job failed in its "Set up job" step, such as `Unable to resolve action actions/checkout@v4`. That is a runner fault before any of our steps ran, and a rerun of the failed jobs passes. Retry it once, only on the first attempt:

```bash
RUN_ID=<run-id>
SETUP_ONLY=$(gh run view "$RUN_ID" --json jobs -q '[.jobs[] | select(.conclusion == "failure") | [.steps[] | select(.conclusion == "failure") | .name]] | length > 0 and all(. == ["Set up job"])')
ATTEMPT=$(gh run view "$RUN_ID" --json attempt -q .attempt)
echo "setup failure only: $SETUP_ONLY, attempt: $ATTEMPT"
if [ "$SETUP_ONLY" = true ] && [ "$ATTEMPT" = 1 ]; then
  gh run rerun "$RUN_ID" --failed
  for attempt in $(seq 12); do
    [ "$(gh run view "$RUN_ID" --json attempt,status -q '"\(.attempt) \(.status)"')" != "1 completed" ] && break
    sleep 5
  done
  gh run watch "$RUN_ID" --exit-status
fi
```

Any other failure, in a test, `tofu apply` or a smoke test step, or a second setup failure, is a real failure: go to step 7, read the log and stop. Never rerun those, and never dispatch Deploy for a run that exists.

## 7. Read the smoke tests

```sh
gh run view <run-id>
gh run view <run-id> --log | grep -E "Smoke test the deployed" | grep -E "EXPECTED_|[0-9]+ pass|[0-9]+ fail|passed|failed"
```

Each suite runs twice, at the staged version and after promotion, and all four steps must pass: "Smoke test the deployed API ..." (`test:api`, prints `N pass` and `0 fail`) and "Smoke test the deployed web app ..." (`test:production`, prints `N passed`). Note `EXPECTED_VERSION` from the log. On a failure, the workflow rolls production back to the versions that were live before the run and reports a `Rolled back` error (see `infrastructure/README.md`). Run `gh run view <run-id> --log-failed`, report it and stop. The screenshots are the `production-smoke-screenshots` artifact on the run.

## 8. Verify live

```sh
curl -s https://api.riftkeeper.app/health
curl -s -o /dev/null -w "%{http_code}\n" https://riftkeeper.app
```

`/health` must answer `status: "ok"`, a card count above zero, and `version` equal to the `EXPECTED_VERSION` from step 7. `https://riftkeeper.app` must answer `200`. Then check the change itself on the live API or page, for example the endpoint or query it changed. After a new custom domain, Cloudflare answers with an empty 404 for about a minute; wait and retry before calling it a failure.

## Report

Reply with the PR URL, the merge SHA, the Deploy run URL, whether you started the deploy or reran a failed setup yourself, any issue you closed by hand, the deployed version from `/health`, and what you checked live. On a stop, name the step, the failing command and its output, and leave the branch and PR as they are.
