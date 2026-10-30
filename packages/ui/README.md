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

| Component          | Props                                                                                     | Events                        |
| ------------------ | ----------------------------------------------------------------------------------------- | ----------------------------- |
| `AppShell`         | default slot for the page content, `footer` slot                                          |                               |
| `Hero`             | `eyebrow`, `title` (the page `h1`, visually hidden), `subtitle` (visually hidden)         |                               |
| `Dither`           | `pattern: "corner" \| "sweep"`, `intensity` (0 to 1), `color: "accent" \| "ink"`, `scale` |                               |
| `SearchBar`        | `v-model` query, `label`, `placeholder`, `name` (`q`), `prompt` (`›`)                     | `submit(query)`               |
| `WarningList`      | `warnings: { message }[]`, renders nothing when empty                                     |                               |
| `StatusMessage`    | `kind: "loading" \| "empty" \| "error"`, `title`, `detail`                                |                               |
| `ResultSummary`    | `shown`, `total`                                                                          |                               |
| `CardGrid`         | `cards: CardSummary[]`, `label`, `placeholders`                                           |                               |
| `CardTile`         | `name`, `subtitle`, `imageUrl`, `orientation`, `srcset`, `sizes`                          |                               |
| `CardTileSkeleton` | `orientation`                                                                             |                               |
| `FilterChips`      | `chips: FilterChipSummary[]`, `moreConditions`, `label`                                   | `remove(id)`                  |
| `SortControl`      | `sort`, `direction: "asc" \| "desc"`, `options: SortOption[]`                             | `change({ sort, direction })` |
| `LoadMoreButton`   | `loading`                                                                                 | `load()`                      |
| `ThemeToggle`      | `v-model` preference: `"system" \| "light" \| "dark"`, `label`                            |                               |
| `Toolbar`          | default slot, stacked on phones and a row that wraps from 40rem                           |                               |

`CardSummary` holds `id`, `name`, `subtitle`, `imageUrl` and `orientation`. `CardGrid` keeps at least two columns. It gives a landscape card, such as a battlefield, two columns so it keeps its shape, and the full row on a phone. `placeholders` appends that many `CardTileSkeleton` tiles, hidden from assistive technology.

`FilterChipSummary` holds `id`, `label`, `value` and `removable`. `FilterChips` shows a remove button only on removable chips and renders nothing without chips. `moreConditions` adds a muted note that the query holds more than the chips show.

`SortControl` shows the sort key as a select and the direction as a button that flips it. The button's accessible name is `Direction: Ascending` or `Direction: Descending`.

`Dither` draws an animated ordered (Bayer 8x8) dither on a canvas that fills its positioned parent. `corner` fades out from the top-right corner, and `sweep` moves a diagonal band across. It paints in the `--rk-color-accent` or `--rk-color-text` token, draws at most 20 frames a second, skips frames while it is off screen, pauses while the tab is hidden and stops when unmounted. With `prefers-reduced-motion` it draws one still frame and redraws it only when the theme changes. `Hero` places a `corner` dither where the text cannot be, and `CardTile` shows a `sweep` until its image loads.

`applyTheme(preference)` in `src/theme.ts`, also exported as `@riftkeeper/ui/theme`, sets `data-theme` on the root element, or removes it for `system`. Storing the choice is the app's job.

Components take data through props and report user actions through events. They never call the API: data fetching belongs to the app.

## Interaction and layout rules

- Every button, select and input has a `:focus-visible` outline in the accent color. Hover styles use the accent color and sit under `@media (hover: hover)`, so a tap does not leave a stuck hover style.
- Controls are at least `--rk-control-height-sm` tall: 44px on touch screens, 32px with a fine pointer.
- The page has a 16px side gutter on phones and works from 320px wide.

## Design tokens

`src/styles.css` defines the tokens as CSS custom properties on `:root` with light values. The dark values apply under `prefers-color-scheme: dark` unless the root has `data-theme="light"`, and always with `data-theme="dark"`. Every component styles itself with them, and apps must not hard-code colors. The fonts, Inter and JetBrains Mono, are bundled from Fontsource, so the page makes no third-party font requests.

| Prefix                                                      | Use                                                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `--rk-color-*`                                              | Background, surfaces, border, text, accent, warning and danger                                           |
| `--rk-space-*`, `--rk-gutter`                               | Spacing on a 0.25rem scale and the page side gutter                                                      |
| `--rk-radius-*`                                             | Corner radii                                                                                             |
| `--rk-font-*`, `--rk-line-height*`, `--rk-letter-spacing-*` | Families, sizes and weights. `--rk-font-family-detail` is the family of small text: chips, summary, sort |
| `--rk-border-width`, `--rk-focus-width`                     | Hairlines and focus outlines                                                                             |
| `--rk-control-height*`                                      | Minimum control heights                                                                                  |
| `--rk-content-width`, `--rk-card-min-width`                 | Page width and grid column width                                                                         |
| `--rk-duration-*`                                           | Transition durations                                                                                     |

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
