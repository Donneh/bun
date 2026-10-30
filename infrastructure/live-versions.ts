import { parseArgs } from "node:util";

type DeploymentVersion = { version_id: string; percentage: number };
type StateResource = {
  type: string;
  deposed_key?: string;
  values: { script_name?: string; versions?: DeploymentVersion[] };
};
type StateModule = { resources?: StateResource[]; child_modules?: StateModule[] };
export type State = { values?: { root_module: StateModule } };

function deployments(module: StateModule): StateResource[] {
  return [
    ...(module.resources ?? []).filter(
      (resource) => resource.type === "cloudflare_workers_deployment" && resource.deposed_key === undefined,
    ),
    ...(module.child_modules ?? []).flatMap(deployments),
  ];
}

function servingVersion(versions: DeploymentVersion[]) {
  return versions.reduce((serving, version) => (version.percentage > serving.percentage ? version : serving))
    .version_id;
}

export function liveVersions(state: State, workers: string[], { bootstrap = false } = {}): Record<string, string> {
  const versions: Record<string, string> = Object.fromEntries(
    deployments(state.values?.root_module ?? {}).flatMap(({ values: { script_name, versions } }) =>
      script_name && versions?.length ? [[script_name, servingVersion(versions)]] : [],
    ),
  );
  const missing = workers.filter((worker) => !(worker in versions));
  if (missing.length > 0 && !bootstrap) {
    throw new Error(
      `The state has no live version for ${missing.join(", ")}. Without one, the deploy would send all traffic to the new version untested. Run the Deploy workflow with bootstrap only when the Worker does not exist yet.`,
    );
  }
  return Object.fromEntries(Object.entries(versions).filter(([worker]) => workers.includes(worker)));
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    options: { bootstrap: { type: "boolean", default: false } },
    allowPositionals: true,
  });
  const state = (await Bun.stdin.json()) as State;
  try {
    console.log(JSON.stringify(liveVersions(state, positionals, { bootstrap: values.bootstrap })));
  } catch (error) {
    console.error(`::error title=No live versions::${(error as Error).message}`);
    process.exit(1);
  }
}
