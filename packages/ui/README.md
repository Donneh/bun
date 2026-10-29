# @riftkeeper/ui

Vue component library and design tokens for the Riftkeeper web frontends. [`@riftkeeper/web`](../../apps/web/README.md) renders every element on its page with these components.

## Use

Add the package to an app, import the styles once, and import components by name:

```ts
import "@riftkeeper/ui/styles.css";
import { CardGrid, SearchBar } from "@riftkeeper/ui";
```

The package ships its `.vue` sources. The app's Vite or Nuxt build compiles them.

## Components

| Component        | Props                                                         | Events                        |
| ---------------- | ------------------------------------------------------------- | ----------------------------- |
| `AppShell`       | `title`, default slot for the page content                    |                               |
| `SearchBar`      | `v-model` query, `label`, `placeholder`, `name` (`q`)         | `submit(query)`               |
| `WarningList`    | `warnings: { message }[]`, renders nothing when empty         |                               |
| `StatusMessage`  | `kind: "loading" \| "empty" \| "error"`, `title`, `detail`    |                               |
| `ResultSummary`  | `shown`, `total`                                              |                               |
| `CardGrid`       | `cards: CardSummary[]`, `label`                               |                               |
| `CardTile`       | `name`, `subtitle`, `imageUrl`, `orientation`                 |                               |
| `FilterChips`    | `chips: FilterChipSummary[]`, `moreConditions`, `label`       | `remove(id)`                  |
| `SortControl`    | `sort`, `direction: "asc" \| "desc"`, `options: SortOption[]` | `change({ sort, direction })` |
| `LoadMoreButton` | `loading`                                                     | `load()`                      |
| `Toolbar`        | default slot, laid out in a row that wraps                    |                               |

`CardSummary` holds `id`, `name`, `subtitle`, `imageUrl` and `orientation`. `CardGrid` gives a landscape card, such as a battlefield, two columns so it keeps its shape.

`FilterChipSummary` holds `id`, `label`, `value` and `removable`. `FilterChips` shows a remove button only on removable chips and renders nothing without chips. `moreConditions` adds a muted note that the query holds more than the chips show.

Components take data through props and report user actions through events. They never call the API: data fetching belongs to the app.

## Design tokens

`src/styles.css` defines the tokens as CSS custom properties on `:root`, with a dark variant under `prefers-color-scheme: dark`. Every component styles itself with them, and apps must not hard-code colors.

| Prefix                                      | Use                                                   |
| ------------------------------------------- | ----------------------------------------------------- |
| `--rk-color-*`                              | Background, surface, text, accent, warning and danger |
| `--rk-space-*`                              | Spacing on a 0.25rem scale                            |
| `--rk-radius-*`                             | Corner radii                                          |
| `--rk-font-*`                               | Font family, sizes and weights                        |
| `--rk-shadow-card`                          | Card tile shadow                                      |
| `--rk-content-width`, `--rk-card-min-width` | Page width and grid column width                      |

## Add a component

1. Add `src/<Name>.vue`. Use only tokens for colors, spacing, radii and type.
2. Export it from `src/index.ts`.
3. Add `src/<Name>.test.ts` that renders it with Testing Library and asserts what a user sees: roles, accessible names and text.

## Check

Run these from `packages/ui`:

```sh
bun run test        # Vitest component tests in happy-dom
bun run typecheck   # vue-tsc
```

The package uses TypeScript 6 because `vue-tsc` needs the TypeScript JavaScript API, which TypeScript 7 does not ship.
