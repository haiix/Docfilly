import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { documentSessionSchemaVersion, type SavedDocumentSession } from "../src/document-session";
import {
  useDocumentPersistence,
  type DocumentPersistenceStore,
} from "../src/use-document-persistence";

const document = {
  name: "guide.md",
  source: "#!docfilly\nname = Initial\n---\n# [[name]]",
  sourceType: "md" as const,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createStore(overrides: Partial<DocumentPersistenceStore> = {}): DocumentPersistenceStore {
  return {
    load: vi.fn(() => Promise.resolve(null)),
    save: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

function createOptions(store: DocumentPersistenceStore) {
  return {
    store,
    saveDelayMs: 50,
    onRestore: vi.fn(),
    onRestoreComplete: vi.fn(),
    onRestoreFailure: vi.fn(),
    onSaveFailure: vi.fn(),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("document persistence", () => {
  it("does not let a late restoration overwrite a document the user selected", async () => {
    const loading = deferred<Awaited<ReturnType<DocumentPersistenceStore["load"]>>>();
    const store = createStore({ load: vi.fn(() => loading.promise) });
    const options = createOptions(store);
    const { result } = renderHook(() => useDocumentPersistence(options));

    act(() => result.current.beginDocumentSelection());
    loading.resolve({
      ...document,
      schemaVersion: documentSessionSchemaVersion,
      values: new Map([["name", "Restored"]]),
      updatedAt: new Date().toISOString(),
    });

    await waitFor(() => expect(store.load).toHaveBeenCalledOnce());
    expect(options.onRestore).not.toHaveBeenCalled();
  });

  it("reports restoration after the restored values render without saving them again", async () => {
    const session: SavedDocumentSession = {
      ...document,
      schemaVersion: documentSessionSchemaVersion,
      values: new Map([["name", "Restored"]]),
      updatedAt: new Date().toISOString(),
    };
    const store = createStore({ load: vi.fn(() => Promise.resolve(session)) });
    const options = createOptions(store);
    const { result } = renderHook(() => useDocumentPersistence(options));

    await waitFor(() => expect(options.onRestore).toHaveBeenCalledWith(session));
    act(() => result.current.persistValues(session.values));

    expect(options.onRestoreComplete).toHaveBeenCalledOnce();
    expect(store.save).not.toHaveBeenCalled();
  });

  it("suppresses a stale restoration notice without saving the restored values", async () => {
    const session: SavedDocumentSession = {
      ...document,
      schemaVersion: documentSessionSchemaVersion,
      values: new Map([["name", "Restored"]]),
      updatedAt: new Date().toISOString(),
    };
    const store = createStore({ load: vi.fn(() => Promise.resolve(session)) });
    const options = createOptions(store);
    const { result } = renderHook(() => useDocumentPersistence(options));

    await waitFor(() => expect(options.onRestore).toHaveBeenCalledWith(session));
    act(() => {
      result.current.invalidateRestoreCompletion();
      result.current.persistValues(session.values);
    });

    expect(options.onRestoreComplete).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
  });

  it("cancels a pending save when the document closes", async () => {
    vi.useFakeTimers();
    const store = createStore();
    const options = createOptions(store);
    const { result } = renderHook(() => useDocumentPersistence(options));
    act(() => {
      result.current.activateDocument(document);
      result.current.persistValues(new Map([["name", "Pending"]]));
    });

    await act(() => result.current.closeDocument());
    await act(() => vi.advanceTimersByTimeAsync(50));

    expect(store.clear).toHaveBeenCalledOnce();
    expect(store.save).not.toHaveBeenCalled();
  });

  it("resumes delayed saving when clearing saved data fails", async () => {
    vi.useFakeTimers();
    const store = createStore({ clear: vi.fn(() => Promise.reject(new Error("failed"))) });
    const options = createOptions(store);
    const { result } = renderHook(() => useDocumentPersistence(options));
    act(() => result.current.activateDocument(document));

    await expect(result.current.clearSavedDocument()).rejects.toThrow("failed");
    act(() => result.current.persistValues(new Map([["name", "Still here"]])));
    await act(() => vi.advanceTimersByTimeAsync(50));

    expect(store.save).toHaveBeenCalledWith(document, new Map([["name", "Still here"]]));
  });
});
