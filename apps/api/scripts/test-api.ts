import type { Subprocess } from "bun";

const READY_TIMEOUT_MS = 30_000;

async function freePort() {
  const server = Bun.serve({ port: 0, fetch: () => new Response() });
  const { port } = server;
  await server.stop();
  return port;
}

async function waitUntilServing(url: URL, worker: Subprocess) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (worker.exitCode !== null) {
      throw new Error(`wrangler dev exited with code ${worker.exitCode} before serving ${url}`);
    }
    try {
      await fetch(url);
      return;
    } catch {
      await Bun.sleep(250);
    }
  }
  throw new Error(`wrangler dev did not serve ${url} within ${READY_TIMEOUT_MS} ms`);
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
    await waitUntilServing(baseUrl, worker);
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
  process.exit(await runSuite(new URL(process.env.BASE_URL)));
}

const local = await startLocalWorker();
try {
  process.exitCode = await runSuite(local.baseUrl);
} finally {
  local.stop();
}
