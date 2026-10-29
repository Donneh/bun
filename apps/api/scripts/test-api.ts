import type { Subprocess } from "bun";

const LOCAL_READY_TIMEOUT_MS = 30_000;
const REMOTE_READY_TIMEOUT_MS = 180_000;

async function freePort() {
  const server = Bun.serve({ port: 0, fetch: () => new Response() });
  const { port } = server;
  await server.stop();
  return port;
}

async function servesApi(baseUrl: URL) {
  try {
    const response = await fetch(new URL("/health", baseUrl));
    return response.headers.get("content-type")?.startsWith("application/json") ?? false;
  } catch {
    return false;
  }
}

async function waitUntilServing(baseUrl: URL, timeoutMs: number, worker?: Subprocess) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (worker && worker.exitCode !== null) {
      throw new Error(`wrangler dev exited with code ${worker.exitCode} before serving ${baseUrl}`);
    }
    if (await servesApi(baseUrl)) {
      return;
    }
    await Bun.sleep(1_000);
  }
  throw new Error(`${baseUrl.origin} did not serve the API within ${timeoutMs} ms`);
}

async function startLocalWorker() {
  const port = await freePort();
  const worker = Bun.spawn(
    [
      "node",
      "node_modules/wrangler/bin/wrangler.js",
      "dev",
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--show-interactive-dev-session=false",
    ],
    { stdout: "ignore", stderr: "inherit", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } },
  );
  const baseUrl = new URL(`http://127.0.0.1:${port}`);
  try {
    await waitUntilServing(baseUrl, LOCAL_READY_TIMEOUT_MS, worker);
  } catch (error) {
    worker.kill();
    throw error;
  }
  return { baseUrl, stop: () => worker.kill() };
}

async function runSuite(baseUrl: URL) {
  console.log(`Running API tests against ${baseUrl.origin}`);
  const suite = Bun.spawn(["bun", "test", "./test-api", ...process.argv.slice(2)], {
    stdio: ["inherit", "inherit", "inherit"],
    env: { ...process.env, BASE_URL: baseUrl.origin },
  });
  return suite.exited;
}

if (process.env.BASE_URL) {
  const baseUrl = new URL(process.env.BASE_URL);
  await waitUntilServing(baseUrl, REMOTE_READY_TIMEOUT_MS);
  process.exit(await runSuite(baseUrl));
}

const local = await startLocalWorker();
try {
  process.exitCode = await runSuite(local.baseUrl);
} finally {
  local.stop();
}
