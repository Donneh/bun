import scheduler from "../src/index.ts";

type Dispatch = { url: string; authorization: string | null; body: string };

const dispatches: Dispatch[] = [];
let githubStatuses = [204];

function nextStatus() {
  return githubStatuses[Math.min(dispatches.length, githubStatuses.length) - 1] ?? 204;
}

globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  dispatches.push({
    url: request.url,
    authorization: request.headers.get("Authorization"),
    body: await request.text(),
  });
  const status = nextStatus();
  return new Response(status === 204 ? null : `{"message":"Fake GitHub answered ${status}"}`, { status });
};

export default {
  fetch: async (request: Request) => {
    const url = new URL(request.url);
    if (url.pathname === "/github-status") {
      githubStatuses = (url.searchParams.get("status") ?? "204").split(",").map(Number);
      dispatches.length = 0;
      return new Response(null, { status: 204 });
    }
    return Response.json(dispatches);
  },
  scheduled: scheduler.scheduled,
};
