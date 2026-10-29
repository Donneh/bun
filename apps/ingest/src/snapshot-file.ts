import type { Card } from "@riftkeeper/cards";
import { parseCardSnapshot } from "@riftkeeper/cards/snapshot";

export async function readCardSnapshotJson(path: string): Promise<unknown> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`Card snapshot ${path} does not exist. Pass --init to scrape without a previous snapshot.`);
  }
  return file.json();
}

export async function readCardSnapshot(path: string): Promise<Card[]> {
  return parseCardSnapshot({ json: await readCardSnapshotJson(path), path });
}
