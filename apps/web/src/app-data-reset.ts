const docfillyCachePrefix = "docfilly-";
const legacyWorkboxCachePrefix = "workbox-";

let registrationSuppressed = false;
let pendingRegistration: Promise<ServiceWorkerRegistration | null> | null = null;

interface AppDataResetEnvironment {
  cacheStorage?: Pick<CacheStorage, "delete" | "keys">;
  serviceWorker?: Pick<ServiceWorkerContainer, "getRegistrations">;
  scopeUrl?: string;
  suppressRegistration?: boolean;
}

export interface AppDataResetResult {
  success: boolean;
}

function docfillyScopeUrl(): string {
  return new URL(import.meta.env.BASE_URL, globalThis.location.origin).href;
}

export function isDocfillyCache(cacheName: string, scopeUrl: string): boolean {
  return (
    cacheName.endsWith(`-${scopeUrl}`) &&
    (cacheName.startsWith(docfillyCachePrefix) || cacheName.startsWith(legacyWorkboxCachePrefix))
  );
}

export function isPwaRegistrationSuppressed(): boolean {
  return registrationSuppressed;
}

export function trackPwaRegistration(
  registration: Promise<ServiceWorkerRegistration>,
): Promise<ServiceWorkerRegistration | null> {
  if (registrationSuppressed) return Promise.resolve(null);

  const trackedRegistration = registration.then(async (result) => {
    if (!registrationSuppressed) return result;
    await result.unregister();
    return null;
  });
  pendingRegistration = trackedRegistration;
  const clearPendingRegistration = (): void => {
    if (pendingRegistration === trackedRegistration) pendingRegistration = null;
  };
  void trackedRegistration.then(clearPendingRegistration, clearPendingRegistration);
  return trackedRegistration;
}

async function deleteDocfillyCaches(
  cacheStorage: Pick<CacheStorage, "delete" | "keys"> | undefined,
  scopeUrl: string,
): Promise<boolean> {
  if (cacheStorage === undefined) return true;

  try {
    const cacheNames = (await cacheStorage.keys()).filter((name) =>
      isDocfillyCache(name, scopeUrl),
    );
    const results = await Promise.allSettled(cacheNames.map((name) => cacheStorage.delete(name)));
    return results.every((result) => result.status === "fulfilled" && result.value);
  } catch {
    return false;
  }
}

async function unregisterDocfillyServiceWorkers(
  serviceWorker: Pick<ServiceWorkerContainer, "getRegistrations"> | undefined,
  scopeUrl: string,
): Promise<boolean> {
  if (serviceWorker === undefined) return true;

  try {
    const registrations = (await serviceWorker.getRegistrations()).filter(
      (registration) => registration.scope === scopeUrl,
    );
    const results = await Promise.allSettled(
      registrations.map((registration) => registration.unregister()),
    );
    return results.every((result) => result.status === "fulfilled" && result.value);
  } catch {
    return false;
  }
}

export async function resetOfflineAppData(
  environment: AppDataResetEnvironment = {},
): Promise<AppDataResetResult> {
  if (environment.suppressRegistration !== false) registrationSuppressed = true;
  if (pendingRegistration !== null) {
    try {
      await pendingRegistration;
    } catch {
      // Registration failures do not prevent cleanup of the data that is available.
    }
  }

  const scopeUrl = environment.scopeUrl ?? docfillyScopeUrl();
  const cacheStorage =
    environment.cacheStorage ?? ("caches" in globalThis ? globalThis.caches : undefined);
  const serviceWorker =
    environment.serviceWorker ??
    ("navigator" in globalThis && "serviceWorker" in globalThis.navigator
      ? globalThis.navigator.serviceWorker
      : undefined);
  const [cachesDeleted, registrationsRemoved] = await Promise.all([
    deleteDocfillyCaches(cacheStorage, scopeUrl),
    unregisterDocfillyServiceWorkers(serviceWorker, scopeUrl),
  ]);

  return { success: cachesDeleted && registrationsRemoved };
}
