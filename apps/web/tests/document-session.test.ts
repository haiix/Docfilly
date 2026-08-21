import { IDBFactory as FDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  clearDocumentSession,
  documentSessionSchemaVersion,
  loadDocumentSession,
  saveDocumentSession,
} from "../src/document-session";

const document = {
  name: "guide.md",
  source: "#!docfilly\nname = Initial\n---\n# [[name]]",
  sourceType: "md" as const,
};

describe("document session storage", () => {
  it("saves, restores, and updates the latest document", async () => {
    const database = new FDBFactory();
    await saveDocumentSession(document, new Map([["name", "First"]]), database);

    const first = await loadDocumentSession(database);
    expect(first).toMatchObject({
      schemaVersion: documentSessionSchemaVersion,
      name: "guide.md",
      source: document.source,
      sourceType: "md",
    });
    expect(first?.values.get("name")).toBe("First");

    await saveDocumentSession(
      { ...document, name: "updated.md" },
      new Map([["name", "Second"]]),
      database,
    );
    const updated = await loadDocumentSession(database);
    expect(updated?.name).toBe("updated.md");
    expect(updated?.values.get("name")).toBe("Second");
  });

  it("deletes the saved document", async () => {
    const database = new FDBFactory();
    await saveDocumentSession(document, new Map(), database);

    await clearDocumentSession(database);

    await expect(loadDocumentSession(database)).resolves.toBeNull();
  });

  it.each([
    ["an unknown schema", { key: "latest", schemaVersion: 999 }],
    ["corrupted values", { key: "latest", schemaVersion: 1, values: { name: 42 } }],
  ])("ignores and removes %s", async (_description, invalidRecord) => {
    const database = new FDBFactory();
    await saveDocumentSession(document, new Map(), database);
    const openRequest = database.open("docfilly-web", 1);
    const connection = await new Promise<IDBDatabase>((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () =>
        reject(openRequest.error ?? new Error("The test database failed to open."));
    });
    const transaction = connection.transaction("document-session", "readwrite");
    transaction.objectStore("document-session").put(invalidRecord);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("The test data could not be written."));
    });
    connection.close();

    await expect(loadDocumentSession(database)).resolves.toBeNull();
    await expect(loadDocumentSession(database)).resolves.toBeNull();
  });
});
