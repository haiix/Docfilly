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
    act(() => result.current.invalidateRestoreCompletion());
    expect(result.current.shouldApplyViewerStatus()).toBe(false);
    act(() => result.current.persistValues(session.values));

    expect(result.current.shouldApplyViewerStatus()).toBe(true);
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

  it("clears the session after an in-progress save completes", async () => {
    vi.useFakeTimers();
    const saving = deferred<void>();
    const operations: string[] = [];
    const store = createStore({
      save: vi.fn(() => {
        operations.push("save");
        return saving.promise;
      }),
      clear: vi.fn(() => {
        operations.push("clear");
        return Promise.resolve();
      }),
    });
    const options = createOptions(store);
    const { result } = renderHook(() => useDocumentPersistence(options));
    act(() => {
      result.current.activateDocument(document);
      result.current.persistValues(new Map([["name", "Saving"]]));
    });
    await act(() => vi.advanceTimersByTimeAsync(50));

    let closing!: Promise<void>;
    act(() => {
      closing = result.current.closeDocument();
    });
    expect(store.clear).not.toHaveBeenCalled();

    saving.resolve();
    await act(() => closing);

    expect(operations).toEqual(["save", "clear"]);
  });

  it("saves a new document after an in-progress save for the previous document", async () => {
    vi.useFakeTimers();
    const firstSave = deferred<void>();
    const nextDocument = { ...document, name: "next.md" };
    const store = createStore({
      save: vi
        .fn<DocumentPersistenceStore["save"]>()
        .mockImplementationOnce(() => firstSave.promise)
        .mockResolvedValueOnce(),
    });
    const options = createOptions(store);
    const { result } = renderHook(() => useDocumentPersistence(options));
    act(() => {
      result.current.activateDocument(document);
      result.current.persistValues(new Map([["name", "Previous"]]));
    });
    await act(() => vi.advanceTimersByTimeAsync(50));

    act(() => {
      result.current.activateDocument(nextDocument);
      result.current.persistValues(new Map([["name", "Next"]]));
    });
    await act(() => vi.advanceTimersByTimeAsync(50));
    expect(store.save).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstSave.resolve();
      await firstSave.promise;
    });

    expect(store.save).toHaveBeenCalledTimes(2);
    expect(store.save).toHaveBeenNthCalledWith(1, document, new Map([["name", "Previous"]]));
    expect(store.save).toHaveBeenNthCalledWith(2, nextDocument, new Map([["name", "Next"]]));
  });

  it("does not report a failed save after its document is replaced", async () => {
    vi.useFakeTimers();
    const saving = deferred<void>();
    const store = createStore({ save: vi.fn(() => saving.promise) });
    const options = createOptions(store);
    const { result } = renderHook(() => useDocumentPersistence(options));
    act(() => {
      result.current.activateDocument(document);
      result.current.persistValues(new Map([["name", "Previous"]]));
    });
    await act(() => vi.advanceTimersByTimeAsync(50));

    act(() => result.current.activateDocument({ ...document, name: "next.md" }));
    saving.reject(new Error("failed"));
    await act(() => Promise.resolve());

    expect(options.onSaveFailure).not.toHaveBeenCalled();
  });

  it("keeps saving suppressed when closing cleanup fails", async () => {
    vi.useFakeTimers();
    const store = createStore({ clear: vi.fn(() => Promise.reject(new Error("failed"))) });
    const options = createOptions(store);
    const { result } = renderHook(() => useDocumentPersistence(options));
    act(() => result.current.activateDocument(document));

    await expect(result.current.closeDocument()).rejects.toThrow("failed");
    act(() => result.current.persistValues(new Map([["name", "Still here"]])));
    await act(() => vi.advanceTimersByTimeAsync(50));

    expect(store.save).not.toHaveBeenCalled();
  });
});
