import schedules from "../schedules.json";

type Dispatch = { url: string; authorization: string | null; body: string };

const READY_TIMEOUT_MS = 30_000;
const token = "fake-dispatch-token";

async function freePort() {
  const server = Bun.serve({ port: 0, fetch: () => new Response() });
  const { port } = server;
  await server.stop();
  return port;
}

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(`not ok ${message}`);
  console.log(`ok ${message}`);
}

const port = await freePort();
const baseUrl = `http://127.0.0.1:${port}`;
const worker = Bun.spawn(
  [
    "node",
    "node_modules/wrangler/bin/wrangler.js",
    "dev",
    "scripts/fake-github.worker.ts",
    "--test-scheduled",
    "--var",
    `GITHUB_DISPATCH_TOKEN:${token}`,
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--show-interactive-dev-session=false",
  ],
  { stdout: "ignore", stderr: "inherit", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } },
);

async function waitUntilServing() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (worker.exitCode !== null) throw new Error(`wrangler dev exited with code ${worker.exitCode}`);
    try {
      await fetch(`${baseUrl}/dispatches`);
      return;
    } catch {
      await Bun.sleep(500);
    }
  }
  throw new Error(`wrangler dev did not serve ${baseUrl} within ${READY_TIMEOUT_MS} ms`);
}

async function runCron(cron: string, githubStatus: number) {
  await fetch(`${baseUrl}/github-status?status=${githubStatus}`);
  const response = await fetch(`${baseUrl}/__scheduled?cron=${encodeURIComponent(cron)}`);
  const dispatches = (await (await fetch(`${baseUrl}/dispatches`)).json()) as Dispatch[];
  return { ok: response.ok, dispatches };
}

try {
  await waitUntilServing();

  for (const [cron, workflow] of Object.entries(schedules)) {
    const { ok, dispatches } = await runCron(cron, 204);
    const [dispatch] = dispatches;
    check(ok, `the "${cron}" event succeeds`);
    check(
      dispatches.length === 1 &&
        dispatch?.url === `https://api.github.com/repos/Donneh/bun/actions/workflows/${workflow}/dispatches` &&
        dispatch.authorization === `Bearer ${token}` &&
        dispatch.body === JSON.stringify({ ref: "main" }),
      `the "${cron}" event dispatches ${workflow} on main with the token`,
    );
  }

  const rejected = await runCron("17 5 * * *", 401);
  check(!rejected.ok, "a dispatch that GitHub rejects fails the scheduled event");

  const unknown = await runCron("0 0 * * *", 204);
  check(!unknown.ok && unknown.dispatches.length === 0, "an unknown cron fails without dispatching");
} finally {
  worker.kill();
  await worker.exited;
}
