import schedules from "../schedules.json";

const repository = "Donneh/bun";
const ref = "main";

export const retryDelaysMs = [2_000, 20_000];

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;
export type Wait = (ms: number) => Promise<void>;

const workflowsByCron: ReadonlyMap<string, string> = new Map(Object.entries(schedules));

export function workflowFor(cron: string) {
  const workflow = workflowsByCron.get(cron);
  if (workflow === undefined) {
    throw new Error(`No workflow is scheduled for the cron "${cron}"`);
  }
  return workflow;
}

const wait: Wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

type Attempt = { dispatched: true } | { dispatched: false; transient: boolean; error: Error };

async function attemptDispatch(workflow: string, token: string, fetcher: Fetch): Promise<Attempt> {
  let response: Response;
  try {
    response = await fetcher(`https://api.github.com/repos/${repository}/actions/workflows/${workflow}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "riftkeeper-scheduler",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref }),
    });
  } catch (cause) {
    return {
      dispatched: false,
      transient: true,
      error: new Error(`Dispatching ${workflow} on ${repository} failed: ${(cause as Error).message}`, { cause }),
    };
  }
  if (response.status === 204) {
    const expiration = response.headers.get("github-authentication-token-expiration");
    console.log(
      `Dispatched ${workflow} on ${repository}@${ref}${expiration ? `; the token expires ${expiration}` : ""}`,
    );
    return { dispatched: true };
  }
  return {
    dispatched: false,
    transient: response.status >= 500,
    error: new Error(
      `Dispatching ${workflow} on ${repository} failed with HTTP ${response.status}: ${await response.text()}`,
    ),
  };
}

export async function dispatchWorkflow(workflow: string, token: string, fetcher: Fetch, waitFor: Wait = wait) {
  for (const delayMs of [...retryDelaysMs, undefined]) {
    const attempt = await attemptDispatch(workflow, token, fetcher);
    if (attempt.dispatched) return;
    if (!attempt.transient || delayMs === undefined) throw attempt.error;
    console.warn(`${attempt.error.message}. Retrying in ${delayMs} ms.`);
    await waitFor(delayMs);
  }
}
