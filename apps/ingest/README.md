# @riftkeeper/ingest

Command-line tool that scrapes the official Riftbound [card gallery](https://playriftbound.com/en-us/card-gallery/), builds cards, and writes the snapshot that [`@riftkeeper/api`](../api/README.md) serves, `apps/api/data/cards.json`. It does not need the API to be running.

## Run

Install from the workspace root (see the [root README](../../README.md)). Run `bun run scrape` from `apps/ingest`, or from the workspace root, where it forwards the flags to this package. Either way the command runs in `apps/ingest`, so relative paths in flags resolve from there.

```sh
bun run scrape                              # refresh apps/api/data/cards.json
bun run scrape --report changes.md          # also write the change report
bun run scrape --pr-body body.md            # also write the report trimmed to GitHub's PR body limit
bun run scrape --snapshot other/cards.json  # use another snapshot path
bun run scrape --init --snapshot new.json   # first run: allow a snapshot file that does not exist yet
bun run scrape --rebuild                    # upgrade a snapshot written for an older card schema
bun run scrape --save-html page.html        # also save the fetched gallery page
bun run scrape --html page.html             # use a saved page instead of fetching
bun run scrape --summary summary.md         # also write a markdown summary of the run
```

A `--snapshot` path that does not exist is an error unless `--init` is given, so a typo cannot create a new file. The command fetches the gallery, builds cards, and compares them with the existing snapshot. It prints one summary line and exits `0` when nothing changed or the snapshot was updated. It exits `1` with a message on stderr when the fetch fails or the guard rejects the scrape, for example when the page returns no cards or loses more than 5% of the known printings. The report is written only when the snapshot changed, and lists added, removed and changed cards followed by scrape warnings where Riot's data looks inconsistent.

## Debugging a failed scrape

A failed run prints `Scrape failed: <summary>` as its first line, then the full error with its stack and `cause` chain. When Riot's data no longer matches `RawPrintingSchema`, the summary says how many printings are affected and the lines below it group the problems by field and message, with the count and up to three example printing ids.

To reproduce a failure offline:

1. Open the failed run in GitHub Actions and download the `gallery-html` artifact. It holds the page the job fetched and is kept for 3 days.
2. Run `bun run scrape --html gallery.html` from `apps/ingest` and read the grouped error. The snapshot is only written when the run succeeds with changes, so pass `--snapshot` with a copy if you do not want to touch `apps/api/data/cards.json`.
3. Fix `src/riot-gallery.schema.ts` or the build step, then run the same command until it succeeds.

`--html` and `--save-html` cannot be combined. A missing `--html` file or an unknown flag fails with a one-line message and no stack.

## Adding a card field

1. Add the field to `GameplaySchema` (facts shared by all printings) or `PrintingSchema` in `packages/cards/src/card.ts`. Conflict detection between printings covers every `GameplaySchema` key automatically.
2. Let the compiler list the rest. `gameplayFacts` in `src/build-cards.ts` must fill the field, and typed fixtures that build a `Gameplay` need a value. If the field comes from Riot's data, add it to `RawPrintingSchema` in `src/riot-gallery.schema.ts`.
3. Add the field to the `makeCard` or `makePrinting` defaults in `packages/cards/test-support/fixtures.ts` and to the fixtures in `src/diff-cards.test.ts`.
4. Run `bun run scrape --rebuild`. The old snapshot no longer matches the schema, so this reads it leniently, fills the missing field from the fresh scrape, and diffs the result. The change report names the added and removed fields and lists only real changes. Without `--rebuild`, the scrape and the API fail with a message that names this command.
5. Run `bun run check` from the workspace root and commit the schema change together with the new `apps/api/data/cards.json`.

## Automation

The workflows live in `.github/workflows/` at the Git repository root, one level above the workspace. `scrape-cards.yml` runs the scrape from `apps/ingest` every day and on demand. When the snapshot changed, it writes a summary with the outcome and the scrape warnings to the run page on every run, and opens or updates one pull request from the `automation/card-snapshot` branch with the change report as its body. GitHub caps a PR body at 65,536 characters, so a larger report is truncated in the body and the full report is attached to the workflow run as the `card-changes` artifact. The workflow then turns on auto-merge, so the pull request squash-merges as soon as the required `check` and `infrastructure` jobs pass, and the merge deploys the new snapshot like any other change to `main`. The snapshot guard keeps an empty scrape, or one that drops more than 5% of the known printings, from ever reaching a pull request. A separate `prices` job in the same workflow runs `bun run prices` and opens and auto-merges a pull request from `automation/price-snapshot` the same way. The two jobs do not depend on each other: a failed price fetch fails only the `prices` job, keeps yesterday's prices, and leaves the card update alone. `ci.yml` runs `bun run check` from the workspace root on pull requests, and the scrape workflow calls it first. If the scrape fails, the fetched page is attached as the `gallery-html` artifact for three days. Both workflows read the Bun version from `packageManager` in the workspace root `package.json`.

One-time repository setup: store a fine-grained personal access token, limited to this repository with **Contents** and **Pull requests** read and write, as the repository secret `SNAPSHOT_PR_TOKEN`, and turn on Settings, General, "Allow auto-merge". The workflow opens and merges the pull request with that token because pull requests and merges made with the default `GITHUB_TOKEN` start no other workflows, so the required checks and the deploy would never run.

## Prices

`bun run prices` fetches TCGplayer prices in USD from [TCGCSV](https://tcgcsv.com/), a free daily mirror of TCGplayer's catalogue, and writes `apps/api/data/prices.json`. It also records the day's market prices in `apps/api/data/price-history.json` when that day is not there yet.

```sh
bun run prices                          # refresh apps/api/data/prices.json
bun run prices --summary summary.md     # also write a markdown summary of the run
bun run prices --pr-body body.md        # also write the summary as a PR body, only when the prices or the history changed
bun run prices --cards other/cards.json --prices other/prices.json --history other/price-history.json
```

TCGCSV lists Riftbound as TCGplayer category `89`. The command reads the set codes from the card snapshot and makes one request at a time, with a User-Agent that names riftkeeper.app: `last-updated.txt` (when TCGCSV built the files, about 20:00 UTC each day, which becomes `updatedAt`), `/tcgplayer/89/groups`, then `products` and `prices` for each group whose abbreviation is one of our set codes. A product matches a printing when `<set code>-<Number>` equals the printing's `publicCode`, for example `OGN-030a/298`. Each match gets a `normal` and a `foil` quote (`market`, `low`, `mid`, `high`) for the finishes TCGplayer sells. Products without a `Number` are sealed products and are skipped.

The summary lists the printings without a price (tokens, which TCGplayer sells as double-sided pairs) and the TCGplayer products without a printing (runes, token pairs, and printings the card gallery does not have yet). Two products with the same number price neither printing, and the summary says so.

The command never writes a partial snapshot. When a request fails, TCGCSV returns something unexpected, or any set would lose the price of more than 5% of its printings priced in the snapshot it replaces (for example because TCGCSV dropped or renamed its group), it keeps the existing `prices.json`, says so in the summary and exits `1`. The file stores one printing per line, sorted by id, so the nightly diff shows only the prices that changed.

### Price history

`price-history.json` keeps the market price of each printing per finish for the last 30 days, which the card page needs for its 30-day change and sparkline, because TCGCSV only gives today's prices. Each run that writes new prices records them under the UTC day of `updatedAt`, the day TCGCSV built them, and drops days more than 30 days before the newest one. Recording the same build again replaces that day, so a rerun changes nothing. A run that fails or is rejected writes neither file, and a night without a run records nothing, so a missed day stays a gap instead of repeating the day before. When the prices are unchanged but the history does not have their day yet, for example because an earlier price pull request merged without it, the run records that day, so the next run repairs the history. A history file that cannot be read never stops the price update: the run still writes `prices.json` and says "Price history not updated" with the reason in its summary. The price pull request carries both files. Git keeps every earlier version of the file, so the full history stays recoverable even though the file holds only 30 days.

## Check

From `apps/ingest`, `bun run test` and `bun run typecheck` check only this package. Biome and the full `bun run check` run from the workspace root.
