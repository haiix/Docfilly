import type { DocfillySourceType } from "docfilly";
import type { LoadedDocument } from "./document-file";

const databaseName = "docfilly-web";
const databaseVersion = 1;
const storeName = "document-session";
const sessionKey = "latest";

export const documentSessionSchemaVersion = 1;

export interface SavedDocumentSession extends LoadedDocument {
  schemaVersion: typeof documentSessionSchemaVersion;
  values: ReadonlyMap<string, string>;
  updatedAt: string;
}

interface StoredDocumentSession {
  key: typeof sessionKey;
  schemaVersion: number;
  name: string;
  source: string;
  sourceType: DocfillySourceType;
  values: Record<string, string>;
  updatedAt: string;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("The IndexedDB operation failed.")),
      { once: true },
    );
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("The document data could not be saved.")),
      { once: true },
    );
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("Saving the document data was interrupted.")),
      { once: true },
    );
  });
}

async function openDatabase(indexedDB: IDBFactory): Promise<IDBDatabase> {
  const request = indexedDB.open(databaseName, databaseVersion);
  request.addEventListener("upgradeneeded", () => {
    if (!request.result.objectStoreNames.contains(storeName)) {
      request.result.createObjectStore(storeName, { keyPath: "key" });
    }
  });
  return requestResult(request);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => typeof entry === "string");
}

function isStoredDocumentSession(value: unknown): value is StoredDocumentSession {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Partial<StoredDocumentSession>;
  return (
    session.key === sessionKey &&
    session.schemaVersion === documentSessionSchemaVersion &&
    typeof session.name === "string" &&
    typeof session.source === "string" &&
    (session.sourceType === "md" || session.sourceType === "text") &&
    isStringRecord(session.values) &&
    typeof session.updatedAt === "string" &&
    !Number.isNaN(Date.parse(session.updatedAt))
  );
}

/** Saves the latest document and serialized form values in this browser profile. */
export async function saveDocumentSession(
  document: LoadedDocument,
  values: ReadonlyMap<string, string>,
  indexedDB: IDBFactory = window.indexedDB,
): Promise<void> {
  const database = await openDatabase(indexedDB);
  try {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put({
      key: sessionKey,
      schemaVersion: documentSessionSchemaVersion,
      ...document,
      values: Object.fromEntries(values),
      updatedAt: new Date().toISOString(),
    } satisfies StoredDocumentSession);
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
}

/** Loads the latest valid session, discarding data that cannot be migrated safely. */
export async function loadDocumentSession(
  indexedDB: IDBFactory = window.indexedDB,
): Promise<SavedDocumentSession | null> {
  const database = await openDatabase(indexedDB);
  try {
    const transaction = database.transaction(storeName, "readonly");
    const stored: unknown = await requestResult(transaction.objectStore(storeName).get(sessionKey));
    await transactionComplete(transaction);
    if (stored === undefined) return null;
    if (!isStoredDocumentSession(stored)) {
      await clearDocumentSession(indexedDB);
      return null;
    }
    return {
      schemaVersion: documentSessionSchemaVersion,
      name: stored.name,
      source: stored.source,
      sourceType: stored.sourceType,
      values: new Map(Object.entries(stored.values)),
      updatedAt: stored.updatedAt,
    };
  } finally {
    database.close();
  }
}

/** Removes the locally persisted document without touching the currently rendered view. */
export async function clearDocumentSession(
  indexedDB: IDBFactory = window.indexedDB,
): Promise<void> {
  const database = await openDatabase(indexedDB);
  try {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(sessionKey);
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
}
