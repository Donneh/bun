const SET_RELEASE_ORDER: readonly string[] = ["OGS", "OGN", "SFD", "UNL", "VEN", "RAD"];

export function setReleaseRank(setCode: string): number {
  const rank = SET_RELEASE_ORDER.indexOf(setCode);
  return rank === -1 ? SET_RELEASE_ORDER.length : rank;
}
