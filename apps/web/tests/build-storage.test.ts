import { IDBFactory } from "fake-indexeddb";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("../src/build-info");
  vi.resetModules();
  localStorage.clear();
});

async function storageFor(channel: "main" | "release") {
  vi.resetModules();
  vi.doMock("../src/build-info", () => ({
    preferencesStorageKey: `docfilly-web-preferences${channel === "release" ? "" : "-main"}`,
    documentDatabaseName: `docfilly-web${channel === "release" ? "" : "-main"}`,
  }));
  return {
    ...(await import("../src/user-preferences")),
    ...(await import("../src/document-session")),
  };
}

it("keeps release data intact when development settings and recovery data are reset", async () => {
  const database = new IDBFactory();
  const release = await storageFor("release");
  const main = await storageFor("main");
  const document = { name: "release.md", source: "Released", sourceType: "md" as const };
  release.writeUserPreferences({ language: "ja", theme: "dark", restoreDocument: true });
  await release.saveDocumentSession(document, new Map(), database);
  expect(main.readUserPreferences().theme).toBe("system");
  await expect(main.loadDocumentSession(database)).resolves.toBeNull();
  main.writeUserPreferences({ language: "en", theme: "light", restoreDocument: false });
  await main.saveDocumentSession({ ...document, source: "Development" }, new Map(), database);
  main.clearUserPreferences();
  await main.clearDocumentSession(database);
  expect(release.readUserPreferences().theme).toBe("dark");
  await expect(release.loadDocumentSession(database)).resolves.toMatchObject(document);
});
