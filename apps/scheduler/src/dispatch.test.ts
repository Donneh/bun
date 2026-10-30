import { describe, expect, test } from "bun:test";
import schedules from "../schedules.json";
import { dispatchWorkflow, type Fetch, retryDelaysMs, workflowFor } from "./dispatch.ts";

type Request = { url: string; init: RequestInit };

function recordingFetch(...outcomes: (Response | Error)[]) {
  const requests: Request[] = [];
  const fetcher: Fetch = async (url, init) => {
    requests.push({ url, init });
    const outcome = outcomes[Math.min(requests.length, outcomes.length) - 1];
    if (outcome instanceof Error) throw outcome;
    return outcome as Response;
  };
  return { fetcher, requests };
}

function recordingWait() {
  const waits: number[] = [];
  return { wait: async (ms: number) => void waits.push(ms), waits };
}

const dispatched = () => new Response(null, { status: 204 });
const unavailable = () => new Response("Service unavailable", { status: 503 });

describe("workflowFor", () => {
  test("runs the production monitor every 15 minutes", () => {
    expect(workflowFor("7,22,37,52 * * * *")).toBe("monitor.yml");
  });

  test("runs the card scrape daily at 05:17 UTC", () => {
    expect(workflowFor("17 5 * * *")).toBe("scrape-cards.yml");
  });

  test("rejects a cron that has no workflow", () => {
    expect(() => workflowFor("0 0 * * *")).toThrow('No workflow is scheduled for the cron "0 0 * * *"');
  });
});

describe("scheduled workflows", () => {
  for (const workflow of Object.values(schedules)) {
    test(`${workflow} can be dispatched and has no GitHub schedule of its own`, async () => {
      const definition = Bun.YAML.parse(
        await Bun.file(new URL(`../../../.github/workflows/${workflow}`, import.meta.url)).text(),
      ) as { on: Record<string, unknown> };

      expect(Object.keys(definition.on)).toContain("workflow_dispatch");
      expect(Object.keys(definition.on)).not.toContain("schedule");
    });
  }
});

describe("dispatchWorkflow", () => {
  test("posts a workflow_dispatch event for main with the token", async () => {
    const { fetcher, requests } = recordingFetch(new Response(null, { status: 204 }));

    await dispatchWorkflow("monitor.yml", "token-1", fetcher);

    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request?.url).toBe("https://api.github.com/repos/Donneh/bun/actions/workflows/monitor.yml/dispatches");
    expect(request?.init.method).toBe("POST");
    expect(request?.init.headers).toMatchObject({
      Authorization: "Bearer token-1",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "riftkeeper-scheduler",
    });
    expect(JSON.parse(String(request?.init.body))).toEqual({ ref: "main" });
  });

  test("throws with the status and body when GitHub does not answer 204", async () => {
    const { fetcher } = recordingFetch(new Response('{"message":"Bad credentials"}', { status: 401 }));

    await expect(dispatchWorkflow("scrape-cards.yml", "expired", fetcher, recordingWait().wait)).rejects.toThrow(
      'Dispatching scrape-cards.yml on Donneh/bun failed with HTTP 401: {"message":"Bad credentials"}',
    );
  });

  test("throws on a success status other than 204", async () => {
    const { fetcher } = recordingFetch(new Response("{}", { status: 200 }));

    await expect(dispatchWorkflow("monitor.yml", "token-1", fetcher, recordingWait().wait)).rejects.toThrow(
      "failed with HTTP 200",
    );
  });

  test("does not retry a client error", async () => {
    const { fetcher, requests } = recordingFetch(new Response("{}", { status: 401 }), dispatched());
    const { wait, waits } = recordingWait();

    await expect(dispatchWorkflow("monitor.yml", "expired", fetcher, wait)).rejects.toThrow("failed with HTTP 401");
    expect(requests).toHaveLength(1);
    expect(waits).toEqual([]);
  });

  test("retries a server error and succeeds", async () => {
    const { fetcher, requests } = recordingFetch(unavailable(), dispatched());
    const { wait, waits } = recordingWait();

    await dispatchWorkflow("scrape-cards.yml", "token-1", fetcher, wait);
    expect(requests).toHaveLength(2);
    expect(waits).toEqual(retryDelaysMs.slice(0, 1));
  });

  test("retries a network error and succeeds", async () => {
    const { fetcher, requests } = recordingFetch(new TypeError("Network connection lost"), dispatched());

    await dispatchWorkflow("scrape-cards.yml", "token-1", fetcher, recordingWait().wait);
    expect(requests).toHaveLength(2);
  });

  test("gives up after the last retry with the last error", async () => {
    const { fetcher, requests } = recordingFetch(
      unavailable(),
      new TypeError("Network connection lost"),
      new Response("Bad gateway", { status: 502 }),
    );
    const { wait, waits } = recordingWait();

    await expect(dispatchWorkflow("monitor.yml", "token-1", fetcher, wait)).rejects.toThrow(
      "Dispatching monitor.yml on Donneh/bun failed with HTTP 502: Bad gateway",
    );
    expect(requests).toHaveLength(retryDelaysMs.length + 1);
    expect(waits).toEqual(retryDelaysMs);
  });
});
