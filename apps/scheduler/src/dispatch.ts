import schedules from "../schedules.json";

const repository = "Donneh/bun";
const ref = "main";

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

const workflowsByCron: ReadonlyMap<string, string> = new Map(Object.entries(schedules));

export function workflowFor(cron: string) {
  const workflow = workflowsByCron.get(cron);
  if (workflow === undefined) {
    throw new Error(`No workflow is scheduled for the cron "${cron}"`);
  }
  return workflow;
}

export async function dispatchWorkflow(workflow: string, token: string, fetcher: Fetch) {
  const response = await fetcher(
    `https://api.github.com/repos/${repository}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "riftkeeper-scheduler",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref }),
    },
  );
  if (response.status !== 204) {
    throw new Error(
      `Dispatching ${workflow} on ${repository} failed with HTTP ${response.status}: ${await response.text()}`,
    );
  }
  console.log(`Dispatched ${workflow} on ${repository}@${ref}`);
}
