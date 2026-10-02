export const buildInfo = __DOCFILLY_BUILD__;

// The release keeps the existing storage names so users retain their saved data.
export function appStorageName(name: string): string {
  return buildInfo.channel === "release" ? name : `${name}-${buildInfo.channel}`;
}

export const preferencesStorageKey = appStorageName("docfilly-web-preferences");
export const documentDatabaseName = appStorageName("docfilly-web");
