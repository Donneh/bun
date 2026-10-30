type DeploymentVersion = { version_id: string; percentage: number };
type StateResource = { type: string; values: { script_name?: string; versions?: DeploymentVersion[] } };
type StateModule = { resources?: StateResource[]; child_modules?: StateModule[] };
type State = { values?: { root_module: StateModule } };

function deployments(module: StateModule): StateResource[] {
  return [
    ...(module.resources ?? []).filter((resource) => resource.type === "cloudflare_workers_deployment"),
    ...(module.child_modules ?? []).flatMap(deployments),
  ];
}

function servingVersion(versions: DeploymentVersion[]) {
  return versions.reduce((serving, version) => (version.percentage > serving.percentage ? version : serving)).version_id;
}

const state = (await Bun.stdin.json()) as State;
const liveVersions = Object.fromEntries(
  deployments(state.values?.root_module ?? {}).flatMap(({ values: { script_name, versions } }) =>
    script_name && versions?.length ? [[script_name, servingVersion(versions)]] : [],
  ),
);
console.log(JSON.stringify(liveVersions));
