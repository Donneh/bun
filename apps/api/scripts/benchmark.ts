import { decompose, parseQuery, type SortDirection, type SortKey, searchCards } from "@riftkeeper/search";
import { createApp } from "../src/app.ts";
import { cards } from "../src/cards/card-snapshot.ts";
import { prices } from "../src/cards/price-snapshot.ts";

interface BenchmarkCase {
  readonly name: string;
  readonly q: string;
  readonly sort?: SortKey;
  readonly direction?: SortDirection;
  readonly page?: number;
  readonly expectMatches: boolean;
}

const WARMUP_ITERATIONS = 50;
const MEASURED_ITERATIONS = 300;

const CASES: readonly BenchmarkCase[] = [
  { name: "empty query", q: "", expectMatches: true },
  { name: "free text, one card", q: "annie", expectMatches: true },
  { name: "free text, no match", q: "zzzz", expectMatches: false },
  { name: "cost", q: "cost:>=5", expectMatches: true },
  { name: "might", q: "m:<3", expectMatches: true },
  { name: "power", q: "p:2", expectMatches: true },
  { name: "domain all-of", q: "c:fury+calm", expectMatches: true },
  { name: "tag", q: "t:ionia", expectMatches: true },
  { name: "type", q: "type:spell", expectMatches: true },
  { name: "supertype", q: "supertype:champion", expectMatches: true },
  { name: "rarity", q: "r:epic", expectMatches: true },
  { name: "variant", q: "variant:alt-art", expectMatches: true },
  { name: "set", q: "s:origins", expectMatches: true },
  { name: "artist", q: "a:studio", expectMatches: true },
  { name: "card text", q: 'ability:"draw 1"', expectMatches: true },
  { name: "combined", q: "(c:fury or c:chaos) -type:spell cost:<=3 r:rare", expectMatches: true },
  { name: "sort name desc", q: "", sort: "name", direction: "desc", expectMatches: true },
  { name: "sort cost", q: "", sort: "cost", expectMatches: true },
  { name: "sort rarity", q: "", sort: "rarity", expectMatches: true },
  { name: "last page", q: "", page: 28, expectMatches: true },
  { name: "64 nested groups", q: `${"(".repeat(64)}c:fury${")".repeat(64)}`, expectMatches: true },
  { name: "512 chars of filters", q: "c:fury cost:>=1 ".repeat(32).slice(0, 512), expectMatches: true },
];

function percentiles(samples: number[]) {
  const sorted = samples.toSorted((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? Number.NaN;
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99) };
}

function ms(value: number) {
  return value.toFixed(3);
}

const app = createApp({ cards, prices });
const failures: string[] = [];
let checksum = 0;

const rows = [];
for (const benchmark of CASES) {
  const request = {
    sort: benchmark.sort ?? "set",
    direction: benchmark.direction ?? "asc",
    page: benchmark.page ?? 1,
  } as const;
  const url = `/search?${new URLSearchParams({ q: benchmark.q, sort: request.sort, direction: request.direction, page: String(request.page) })}`;

  const runCore = () => {
    const { root } = parseQuery(benchmark.q);
    const result = searchCards(cards, { root, ...request });
    checksum += result.cards.length + decompose(benchmark.q, root).filters.length;
    return result.total;
  };
  const runRequest = async () => {
    const response = await app.request(url);
    const body = await response.text();
    if (response.status !== 200) failures.push(`${benchmark.name}: HTTP ${response.status}`);
    checksum += body.length;
    return body.length;
  };

  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    runCore();
    await runRequest();
  }

  const coreSamples: number[] = [];
  const requestSamples: number[] = [];
  let total = 0;
  let bytes = 0;
  for (let i = 0; i < MEASURED_ITERATIONS; i++) {
    let start = performance.now();
    total = runCore();
    coreSamples.push(performance.now() - start);

    start = performance.now();
    bytes = await runRequest();
    requestSamples.push(performance.now() - start);
  }

  if (benchmark.expectMatches !== total > 0) {
    failures.push(`${benchmark.name}: expected ${benchmark.expectMatches ? "matches" : "no matches"}, got ${total}`);
  }

  const core = percentiles(coreSamples);
  const full = percentiles(requestSamples);
  rows.push({
    case: benchmark.name,
    matches: total,
    "core p50 ms": ms(core.p50),
    "core p99 ms": ms(core.p99),
    "request p50 ms": ms(full.p50),
    "request p95 ms": ms(full.p95),
    "request p99 ms": ms(full.p99),
    "response KB": (bytes / 1024).toFixed(1),
  });
}

const runtime = typeof Bun === "undefined" ? `node ${process.version}` : `bun ${Bun.version}`;
console.log(`Search benchmark on ${runtime}, ${cards.length} cards, ${MEASURED_ITERATIONS} measured runs per case`);
console.table(rows);
console.log(`Failures: ${failures.length}${failures.length > 0 ? `\n${failures.join("\n")}` : ""}`);
console.log(`Checksum: ${checksum}`);
process.exitCode = failures.length > 0 ? 1 : 0;
