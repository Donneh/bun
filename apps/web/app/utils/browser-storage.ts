export type StorageAccess = () => Pick<Storage, "getItem" | "setItem">;

export const browserStorage: StorageAccess = () => window.localStorage;
