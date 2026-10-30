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

| Component                | Props                                                                                                                                                                                                        | Events                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `AppShell`               | default slot for the page content; clips sideways overflow so full-bleed decoration never scrolls the page                                                                                                   |                               |
| `Hero`                   | `eyebrow`, `title` (the page `h1`, visually hidden; leave it out when the page has its own), `subtitle` (visually hidden), `compact` (less space above, for inner pages), `actions` slot on the eyebrow line |                               |
| `Dither`                 | `pattern: "corner" \| "sweep"`, `intensity` (0 to 1), `color: "accent" \| "ink"`, `scale`, `avoid` (elements), `clearance` (px)                                                                              |                               |
| `SearchBar`              | `v-model` query, `label`, `placeholder`, `name` (`q`), `prompt` (`›`)                                                                                                                                        | `submit(query)`               |
| `ExampleQueries`         | `queries`, `lead` (`Try`), `label` (`Example queries`); one compact line that wraps, renders nothing when empty                                                                                              | `select(query)`               |
| `WarningList`            | `warnings: { message }[]`, renders nothing when empty                                                                                                                                                        |                               |
| `StatusMessage`          | `kind: "loading" \| "empty" \| "error"`, `title`, `detail`, `action` (button label)                                                                                                                          | `action()`                    |
| `ResultSummary`          | `shown`, `total` with thousands separators, `searching` (says "Searching…" in the same place), a polite status region                                                                                        |                               |
| `CardGrid`               | `cards: CardSummary[]`, `label`, `placeholders`, `stale` (dimmed and `aria-busy`)                                                                                                                            | `navigate(href)`              |
| `CardTile`               | `name`, `subtitle`, `imageUrl`, `orientation`, `href`, `srcset`, `sizes`                                                                                                                                     | `navigate(href)`              |
| `CardImage`              | `name` (the alt text), `imageUrl`, `orientation`, `srcset`, `sizes`, `loading: "lazy" \| "eager"`                                                                                                            |                               |
| `CardDetail`             | `orientation`, `busy`, `art` slot and default slot for the details                                                                                                                                           |                               |
| `CardDetailSkeleton`     | `orientation`, `label` (`Loading card`)                                                                                                                                                                      |                               |
| `CardHeading`            | `name` (the page `h1`), `subtitle`                                                                                                                                                                           |                               |
| `CardFacts`              | `facts: CardFact[]`, renders nothing when empty                                                                                                                                                              |                               |
| `CardText`               | `text`, rules text with `[Keyword]` and `:rb_…:` symbols                                                                                                                                                     |                               |
| `PrintingList`           | `printings: PrintingSummary[]`, `selected` (printing id), `label` (`Printings`)                                                                                                                              | `select(id)`                  |
| `BackLink`               | `href`, `label` (`Back to results`)                                                                                                                                                                          | `navigate(href)`              |
| `CardTileSkeleton`       | `orientation`                                                                                                                                                                                                |                               |
| `FilterChips`            | `chips: FilterChipSummary[]`, `moreConditions`, `label`, `placeholder` (one skeleton chip while there are none)                                                                                              | `remove(id)`                  |
| `SortControl`            | `sort`, `direction: "asc" \| "desc"`, `options: SortOption[]`                                                                                                                                                | `change({ sort, direction })` |
| `ThemeButton`            | `v-model` preference: `"system" \| "light" \| "dark"`                                                                                                                                                        |                               |
| `InfiniteScrollSentinel` | `margin` (the `IntersectionObserver` root margin, `0px 0px 800px 0px`)                                                                                                                                       | `change(visible)`             |
| `Toolbar`                | default slot, stacked on phones and a row that wraps from 40rem                                                                                                                                              |                               |

`CardSummary` holds `id`, `name`, `subtitle`, `imageUrl`, `orientation` and `href`, plus optional `srcset` and `sizes`. `CardGrid` keeps at least two columns. It gives a landscape card, such as a battlefield, two columns so it keeps its shape, and the full row on a phone. `placeholders` appends that many `CardTileSkeleton` tiles, hidden from assistive technology.

`FilterChipSummary` holds `id`, `label`, `value` and `removable`. `FilterChips` shows a remove button only on removable chips and renders nothing without chips. `moreConditions` adds a muted note that the query holds more than the chips show.

`SortControl` shows the sort key as a select and the direction as a button that flips it. The button's accessible name is `Direction: Ascending` or `Direction: Descending`.

`Dither` draws an animated ordered (Bayer 8x8) dither on a canvas that fills its positioned parent. `corner` is densest in the top-right corner and thins out to nothing before the canvas's left and bottom edges, so it never ends in a straight line. `sweep` moves a diagonal band across. The pattern keeps clear of every element in `avoid`: it paints nothing over them and thins out over `clearance` pixels around them. It paints in the `--rk-color-accent` or `--rk-color-text` token, draws at most 20 frames a second, skips frames while it is off screen, pauses while the tab is hidden and stops when unmounted. With `prefers-reduced-motion` it draws one still frame and redraws it only when the theme, the window size or the size of an avoided element changes.

`Hero` runs a `corner` dither to the top and right edges of the viewport, 10rem tall on phones and 15rem from 48rem. It avoids the eyebrow text, the `actions` slot and the content column below the hero, so the pattern shows only around the eyebrow line and in the right margin. `CardTile` is bare art: the image and its caption, with no frame. On hover the image lifts and the name turns the accent color. It shows a `sweep` until its image loads. The tile is a link to `href`, named by the card's name and subtitle, with a focus outline around the art.

`CardTile` and `BackLink` are real links, so a middle click, a modified click or "open in new tab" works. They report a plain left click as `navigate(href)` and cancel it, so the app can route without a reload. `CardGrid` passes its tiles' `navigate` on.

`CardImage` is the bare card art with the `sweep` until its image loads, again whenever `imageUrl` changes. `CardTile` uses it. `CardDetail` lays a card page out: the art in a column on the left from 48rem (22rem for portrait cards, 30rem for landscape ones, sticky while the details scroll), above the details on a phone. `CardDetailSkeleton` is the same layout with a `sweep` and grey lines, `aria-busy` while the card loads.

`CardFact` holds `label`, `value` and `rulesText`. `CardFacts` shows the facts as a description list with mono labels; a fact with `rulesText` takes the full width and renders through `CardText`, which bolds `[Keyword]`s and shows symbols such as `:rb_energy_2:` or `:rb_might:` as small labelled tokens. `PrintingSummary` holds `id`, `setName`, `code` and `details`. `PrintingList` shows one button per printing and marks the selected one with `aria-pressed`.

`ThemeButton` cycles system, light and dark. Its icon shows the current mode (a monitor, a sun or a moon), and its accessible name and tooltip say it, as in `Theme: system`.

`InfiniteScrollSentinel` is an empty element that reports `change(true)` when it comes within `margin` of the viewport and `change(false)` when it leaves or unmounts. The app decides what to load.

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
