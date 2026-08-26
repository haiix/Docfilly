import { describe, expect, it, vi } from "vitest";
import { isDocfillyCache, resetOfflineAppData } from "../src/app-data-reset";

const scopeUrl = "https://example.test/Docfilly/";

function registration(scope: string, succeeds = true) {
  const unregister = vi.fn(() => Promise.resolve(succeeds));
  return {
    value: { scope, unregister } as unknown as ServiceWorkerRegistration,
    unregister,
  };
}

describe("app data reset", () => {
  it("identifies current and legacy Workbox caches only for the Docfilly scope", () => {
    expect(isDocfillyCache(`docfilly-precache-v2-${scopeUrl}`, scopeUrl)).toBe(true);
    expect(isDocfillyCache(`workbox-precache-v2-${scopeUrl}`, scopeUrl)).toBe(true);
    expect(
      isDocfillyCache("workbox-precache-v2-https://example.test/another-project/", scopeUrl),
    ).toBe(false);
    expect(isDocfillyCache(`unrelated-${scopeUrl}`, scopeUrl)).toBe(false);
  });

  it("deletes only Docfilly caches and unregisters only its service worker", async () => {
    const cacheNames = [
      `docfilly-precache-v2-${scopeUrl}`,
      `workbox-precache-v2-${scopeUrl}`,
      "workbox-precache-v2-https://example.test/another-project/",
      "unrelated-cache",
    ];
    const deleteCache = vi.fn(() => Promise.resolve(true));
    const docfillyRegistration = registration(scopeUrl);
    const otherRegistration = registration("https://example.test/another-project/");

    const result = await resetOfflineAppData({
      scopeUrl,
      suppressRegistration: false,
      cacheStorage: { keys: vi.fn(() => Promise.resolve(cacheNames)), delete: deleteCache },
      serviceWorker: {
        getRegistrations: vi.fn(() =>
          Promise.resolve([docfillyRegistration.value, otherRegistration.value]),
        ),
      },
    });

    expect(result.success).toBe(true);
    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledWith(cacheNames[0]);
    expect(deleteCache).toHaveBeenCalledWith(cacheNames[1]);
    expect(docfillyRegistration.unregister).toHaveBeenCalledOnce();
    expect(otherRegistration.unregister).not.toHaveBeenCalled();
  });

  it("treats false results as targets that were already absent", async () => {
    const unregister = vi.fn(() => Promise.resolve(false));
    const result = await resetOfflineAppData({
      scopeUrl,
      suppressRegistration: false,
      cacheStorage: {
        keys: vi.fn(() => Promise.resolve([`docfilly-precache-v2-${scopeUrl}`])),
        delete: vi.fn(() => Promise.resolve(false)),
      },
      serviceWorker: {
        getRegistrations: vi.fn(() =>
          Promise.resolve([
            { scope: scopeUrl, unregister } as unknown as ServiceWorkerRegistration,
          ]),
        ),
      },
    });

    expect(result.success).toBe(true);
    expect(unregister).toHaveBeenCalledOnce();
  });

  it("reports a rejected deletion while continuing the available cleanup", async () => {
    const unregister = vi.fn(() => Promise.resolve(true));
    const result = await resetOfflineAppData({
      scopeUrl,
      suppressRegistration: false,
      cacheStorage: {
        keys: vi.fn(() => Promise.resolve([`docfilly-precache-v2-${scopeUrl}`])),
        delete: vi.fn(() => Promise.reject(new Error("failed"))),
      },
      serviceWorker: {
        getRegistrations: vi.fn(() =>
          Promise.resolve([
            { scope: scopeUrl, unregister } as unknown as ServiceWorkerRegistration,
          ]),
        ),
      },
    });

    expect(result.success).toBe(false);
    expect(unregister).toHaveBeenCalledOnce();
  });

  it("succeeds when Cache Storage and Service Worker APIs are unavailable", async () => {
    await expect(resetOfflineAppData({ scopeUrl, suppressRegistration: false })).resolves.toEqual({
      success: true,
    });
  });
});
