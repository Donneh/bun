import { describe, expect, test } from "bun:test";
import schedules from "../schedules.json";
import { dispatchWorkflow, type Fetch, workflowFor } from "./dispatch.ts";

type Request = { url: string; init: RequestInit };

function recordingFetch(response: Response) {
  const requests: Request[] = [];
  const fetcher: Fetch = async (url, init) => {
    requests.push({ url, init });
    return response;
  };
  return { fetcher, requests };
}

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

    await expect(dispatchWorkflow("scrape-cards.yml", "expired", fetcher)).rejects.toThrow(
      'Dispatching scrape-cards.yml on Donneh/bun failed with HTTP 401: {"message":"Bad credentials"}',
    );
  });

  test("throws on a success status other than 204", async () => {
    const { fetcher } = recordingFetch(new Response("{}", { status: 200 }));

    await expect(dispatchWorkflow("monitor.yml", "token-1", fetcher)).rejects.toThrow("failed with HTTP 200");
  });
});
