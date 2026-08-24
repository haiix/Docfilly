import { useCallback, useEffect, useRef } from "react";
import type { LoadedDocument } from "./document-file";
import {
  clearDocumentSession,
  loadDocumentSession,
  saveDocumentSession,
  type SavedDocumentSession,
} from "./document-session";

export interface DocumentPersistenceStore {
  load: () => Promise<SavedDocumentSession | null>;
  save: (document: LoadedDocument, values: ReadonlyMap<string, string>) => Promise<void>;
  clear: () => Promise<void>;
}

const defaultStore: DocumentPersistenceStore = {
  load: () => loadDocumentSession(),
  save: (document, values) => saveDocumentSession(document, values),
  clear: () => clearDocumentSession(),
};

interface DocumentPersistenceOptions {
  onRestore: (session: SavedDocumentSession) => void;
  onRestoreComplete: () => void;
  onRestoreFailure: () => void;
  onSaveFailure: () => void;
  saveDelayMs?: number;
  store?: DocumentPersistenceStore;
}

export function useDocumentPersistence({
  onRestore,
  onRestoreComplete,
  onRestoreFailure,
  onSaveFailure,
  saveDelayMs = 500,
  store = defaultStore,
}: DocumentPersistenceOptions) {
  const callbacksRef = useRef({
    onRestore,
    onRestoreComplete,
    onRestoreFailure,
    onSaveFailure,
  });
  callbacksRef.current = { onRestore, onRestoreComplete, onRestoreFailure, onSaveFailure };
  const storeRef = useRef(store);
  const documentRef = useRef<LoadedDocument | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoreCancelledRef = useRef(false);
  const restoredNoticeRef = useRef(false);
  const persistenceSuppressedRef = useRef(false);

  const cancelPendingSave = useCallback((): void => {
    if (saveTimerRef.current === undefined) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = undefined;
  }, []);

  useEffect(() => {
    let active = true;
    void storeRef.current
      .load()
      .then((session) => {
        if (!active || restoreCancelledRef.current || session === null) return;
        documentRef.current = session;
        restoredNoticeRef.current = true;
        callbacksRef.current.onRestore(session);
      })
      .catch(() => {
        if (active && !restoreCancelledRef.current) callbacksRef.current.onRestoreFailure();
      });

    return () => {
      active = false;
      cancelPendingSave();
    };
  }, [cancelPendingSave]);

  const beginDocumentSelection = useCallback((): void => {
    restoreCancelledRef.current = true;
  }, []);

  const activateDocument = useCallback(
    (document: LoadedDocument): void => {
      cancelPendingSave();
      restoreCancelledRef.current = true;
      restoredNoticeRef.current = false;
      persistenceSuppressedRef.current = false;
      documentRef.current = document;
    },
    [cancelPendingSave],
  );

  const persistValues = useCallback(
    (values: ReadonlyMap<string, string>): void => {
      if (restoredNoticeRef.current) {
        restoredNoticeRef.current = false;
        callbacksRef.current.onRestoreComplete();
        return;
      }
      if (persistenceSuppressedRef.current || documentRef.current === null) return;
      cancelPendingSave();
      const document = documentRef.current;
      const valuesToSave = new Map(values);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = undefined;
        void storeRef.current
          .save(document, valuesToSave)
          .catch(() => callbacksRef.current.onSaveFailure());
      }, saveDelayMs);
    },
    [cancelPendingSave, saveDelayMs],
  );

  const clearSavedDocument = useCallback(async (): Promise<void> => {
    restoreCancelledRef.current = true;
    cancelPendingSave();
    persistenceSuppressedRef.current = true;
    try {
      await storeRef.current.clear();
    } catch (error) {
      persistenceSuppressedRef.current = false;
      throw error;
    }
  }, [cancelPendingSave]);

  const closeDocument = useCallback(async (): Promise<void> => {
    restoreCancelledRef.current = true;
    restoredNoticeRef.current = false;
    cancelPendingSave();
    persistenceSuppressedRef.current = true;
    documentRef.current = null;
    await storeRef.current.clear();
  }, [cancelPendingSave]);

  return {
    beginDocumentSelection,
    activateDocument,
    persistValues,
    clearSavedDocument,
    closeDocument,
  };
}
