export const maxRunAgeMinutes: Readonly<Record<string, number>> = {
  "monitor.yml": 60,
  "scrape-cards.yml": 26 * 60,
};

export type LatestRun = { workflow: string; createdAt?: string; url?: string };
export type StaleWorkflow = LatestRun & { maxAgeMinutes: number };

export function maxAgeMinutesOf(workflow: string) {
  const maxAge = maxRunAgeMinutes[workflow];
  if (maxAge === undefined) {
    throw new Error(`The watchdog has no maximum run age for ${workflow}. Add it to maxRunAgeMinutes.`);
  }
  return maxAge;
}

export function staleWorkflows(latestRuns: LatestRun[], now: Date): StaleWorkflow[] {
  return latestRuns.flatMap((run) => {
    const maxAgeMinutes = maxAgeMinutesOf(run.workflow);
    const fresh = run.createdAt !== undefined && now.getTime() - Date.parse(run.createdAt) <= maxAgeMinutes * 60_000;
    return fresh ? [] : [{ ...run, maxAgeMinutes }];
  });
}
