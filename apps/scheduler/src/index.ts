import { dispatchWorkflow, workflowFor } from "./dispatch.ts";

type Env = { GITHUB_DISPATCH_TOKEN: string };

export default {
  fetch: () => new Response("Not found", { status: 404 }),
  scheduled: (controller, env) =>
    dispatchWorkflow(workflowFor(controller.cron), env.GITHUB_DISPATCH_TOKEN, (url, init) => fetch(url, init)),
} satisfies ExportedHandler<Env>;
