import scheduler from "../src/index.ts";

type Dispatch = { url: string; authorization: string | null; body: string };

const dispatches: Dispatch[] = [];
let githubStatus = 204;

globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  dispatches.push({
    url: request.url,
    authorization: request.headers.get("Authorization"),
    body: await request.text(),
  });
  return new Response(githubStatus === 204 ? null : '{"message":"Bad credentials"}', { status: githubStatus });
};

export default {
  fetch: async (request: Request) => {
    const url = new URL(request.url);
    if (url.pathname === "/github-status") {
      githubStatus = Number(url.searchParams.get("status"));
      dispatches.length = 0;
      return new Response(null, { status: 204 });
    }
    return Response.json(dispatches);
  },
  scheduled: scheduler.scheduled,
};
