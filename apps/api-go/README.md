# Riftkeeper API in Go

An independent, standalone Go implementation of the Riftkeeper card API. It uses
the Go standard library and reads the existing card and price snapshots. It does
not run on Cloudflare Workers or change the deployed API.

## Run

With Go 1.22 or newer, from this directory:

```sh
go run . -addr :3000 -data ../api/data
```

The data directory must contain `cards.json` and `prices.json`. Snapshots are
loaded once at startup; restart the server to pick up updates. For deployment,
build with `go build -o riftkeeper-api .` and supply the snapshots using `-data`.
The standalone server reports `null` for the Cloudflare-specific health version.

The API exposes `/health`, `/cards`, `/cards/:id`, `/search`, and
`/search/options`. The search syntax is documented in `../api/README.md`.

## Reading the code

Start with these files, in order:

1. `main.go`: read flags, load snapshots, start HTTP with timeouts, and shut down on a signal.
2. `internal/api/routes.go`: find every endpoint in one list of `HandleFunc` registrations.
3. `internal/cards/card.go`: the typed card, printing, set, and price models.
4. `internal/api/card_handler.go`: HTTP validation and responses for card endpoints.
5. `internal/cards/service.go`: list cards, find a card by ID, and count the catalog.
6. `internal/api/search_handler.go`: validate HTTP input and call the search service.
7. `internal/search/service.go`: search the loaded catalog and expose its search options.
8. `internal/search/search.go`: the service's parsing, matching, sorting, and pagination engine.

The other files handle specific parts of that flow:

| File under `internal`   | Responsibility                                                   |
| ----------------------- | ---------------------------------------------------------------- |
| `cards/snapshot.go`     | Read JSON snapshots and join prices to printings                 |
| `cards/decode.go`       | Decode required fields without silently accepting unknown fields |
| `cards/validate.go`     | Validate snapshot values and reject duplicate IDs                |
| `api/response.go`       | Write JSON data and error responses                              |
| `api/server.go`         | Initialize the router and apply CORS and method handling         |
| `search/options.go`     | Build the available search choices and sets                      |
| `api/search_request.go` | Validate HTTP query parameters and defaults                      |
| `search/match.go`       | Decide whether a printing satisfies a search expression          |
| `search/sort.go`        | Order matching cards with deterministic tie-breakers             |
| `search/decompose.go`   | Describe filters as editable controls for the frontend           |
| `search/syntax.go`      | Search tokens, expression nodes, and UTF-16 source locations     |
| `search/lexer.go`       | Split a query into tokens, handling quotes and escapes           |
| `search/parser.go`      | Build the expression tree with AND, OR, NOT, and groups          |
| `search/filter.go`      | Validate filter values and resolve aliases                       |
| `search/request.go`     | Named sort keys and directions                                   |
| `api/server_test.go`    | Exercise HTTP endpoints and search responses                     |
| `search/search_test.go` | Verify that searches preserve the shared snapshot                |

The request flow is:

```text
HTTP routes → CardHandler   → cards.Service  → loaded snapshot
            → SearchHandler → search.Service → loaded snapshot
```

Startup calls `cards.Load` once, constructs both services from the resulting catalog,
and passes them to `api.NewHandler(cardService, searchService)`. The HTTP package
owns request parsing, validation, routing, status codes, and JSON responses. Services
own catalog access, the card-ID index, and the precomputed search options. Neither
service knows about HTTP. They share the loaded snapshot as read-only data; callers
must not mutate the catalog or returned card slices.

`search.Service.Search` accepts a `search.Request` and returns a result and an error.
The zero-value request uses page 1, set ordering, and ascending direction. Invalid
sort keys, directions, negative pages, and cards without printings return errors.
Pages use `int64` internally; JavaScript-style numeric parsing remains in the HTTP adapter.
`api.NewHandler` returns a standard `http.Handler`.
Startup owns file loading and its errors. Helpers stay private
within each package; the `internal` directory prevents outside projects from
importing these application packages. There are no framework layers or interface
wrappers between them. The varied filter-chip JSON values remain confined to
`search/decompose.go` rather than being used to represent card data.

### Go conventions used here

- Struct fields such as `Card.Name` replace string-keyed maps. JSON tags preserve
  the API's existing field names.
- A pointer such as `*int` allows a stat to be absent (`nil`) rather than zero.
  The JSON encoder writes `nil` as `null`.
- A slice such as `[]Printing` is a list of typed printings.
- Functions return errors explicitly; callers handle them with `if err != nil`.
- The server implements `ServeHTTP`, which makes it an `http.Handler` without
  inheriting a base class or using a framework.
- Search copies card values and builds new printing slices, so requests do not
  modify the shared snapshot.

The parser is inherently more involved than the endpoint code. It preserves the
existing query language, including malformed-input recovery and warnings. Source
spans use UTF-16 offsets to match the JavaScript frontend. Numeric validation
also preserves the original API's JavaScript coercion and error messages.

## Verification

Run Go tests with `go test ./...`. The existing API's black-box tests can also
run against the Go server: from `apps/api`, set `BASE_URL` to the Go server and
run `bun test test-api`.

Focused Go tests use small card fixtures to cover parser precedence, malformed
queries, UTF-16 source spans, printing-level matching, sorting with missing stats,
request defaults, large pages, and invalid snapshots. Lifecycle tests check
cancellation and listen failures. The snapshot immutability test and HTTP tests
also exercise the shared real data. Run `go vet ./...` for static checks.
