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
  enabled: boolean;
  onRestore: (session: SavedDocumentSession) => void;
  onRestoreComplete: () => void;
  onRestoreFailure: () => void;
  onSaveFailure: () => void;
  onClearFailure: () => void;
  saveDelayMs?: number;
  store?: DocumentPersistenceStore;
}

export function useDocumentPersistence({
  enabled,
  onRestore,
  onRestoreComplete,
  onRestoreFailure,
  onSaveFailure,
  onClearFailure,
  saveDelayMs = 500,
  store = defaultStore,
}: DocumentPersistenceOptions) {
  const callbacksRef = useRef({
    onRestore,
    onRestoreComplete,
    onRestoreFailure,
    onSaveFailure,
    onClearFailure,
  });
  callbacksRef.current = {
    onRestore,
    onRestoreComplete,
    onRestoreFailure,
    onSaveFailure,
    onClearFailure,
  };
  const storeRef = useRef(store);
  const documentRef = useRef<LoadedDocument | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const operationQueueRef = useRef(Promise.resolve());
  const restoreCancelledRef = useRef(false);
  const operationGenerationRef = useRef(0);
  const restoreStartedGenerationRef = useRef(operationGenerationRef.current);
  const restoredRenderGenerationRef = useRef<number | undefined>(undefined);
  const persistenceEnabledRef = useRef(enabled);
  const persistenceSuppressedRef = useRef(!enabled);

  const cancelPendingSave = useCallback((): void => {
    if (saveTimerRef.current === undefined) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = undefined;
  }, []);

  const enqueueOperation = useCallback(<T>(operation: () => Promise<T>): Promise<T> => {
    const result = operationQueueRef.current.then(operation);
    operationQueueRef.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }, []);

  useEffect(() => {
    let active = true;
    if (persistenceEnabledRef.current) {
      void storeRef.current
        .load()
        .then((session) => {
          if (!active || restoreCancelledRef.current || session === null) return;
          documentRef.current = session;
          restoredRenderGenerationRef.current = restoreStartedGenerationRef.current;
          callbacksRef.current.onRestore(session);
        })
        .catch(() => {
          if (active && !restoreCancelledRef.current) callbacksRef.current.onRestoreFailure();
        });
    } else {
      void enqueueOperation(() => storeRef.current.clear()).catch(() => {
        if (active && !persistenceEnabledRef.current) callbacksRef.current.onClearFailure();
      });
    }

    return () => {
      active = false;
      cancelPendingSave();
    };
  }, [cancelPendingSave, enqueueOperation]);

  const beginDocumentSelection = useCallback((): void => {
    operationGenerationRef.current += 1;
    restoreCancelledRef.current = true;
  }, []);

  const invalidateRestoreCompletion = useCallback((): void => {
    operationGenerationRef.current += 1;
  }, []);

  const shouldApplyViewerStatus = useCallback(
    (): boolean =>
      restoredRenderGenerationRef.current === undefined ||
      restoredRenderGenerationRef.current === operationGenerationRef.current,
    [],
  );

  const activateDocument = useCallback(
    (document: LoadedDocument): void => {
      cancelPendingSave();
      operationGenerationRef.current += 1;
      restoreCancelledRef.current = true;
      restoredRenderGenerationRef.current = undefined;
      persistenceSuppressedRef.current = !persistenceEnabledRef.current;
      documentRef.current = document;
    },
    [cancelPendingSave],
  );

  const persistValues = useCallback(
    (values: ReadonlyMap<string, string>): void => {
      if (restoredRenderGenerationRef.current !== undefined) {
        const shouldNotify = restoredRenderGenerationRef.current === operationGenerationRef.current;
        restoredRenderGenerationRef.current = undefined;
        if (shouldNotify) callbacksRef.current.onRestoreComplete();
        return;
      }
      if (persistenceSuppressedRef.current || documentRef.current === null) return;
      cancelPendingSave();
      const document = documentRef.current;
      const valuesToSave = new Map(values);
      const operationGeneration = operationGenerationRef.current;
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = undefined;
        void enqueueOperation(() => storeRef.current.save(document, valuesToSave)).catch(() => {
          if (operationGeneration === operationGenerationRef.current) {
            callbacksRef.current.onSaveFailure();
          }
        });
      }, saveDelayMs);
    },
    [cancelPendingSave, enqueueOperation, saveDelayMs],
  );

  const closeDocument = useCallback(async (): Promise<void> => {
    operationGenerationRef.current += 1;
    restoreCancelledRef.current = true;
    restoredRenderGenerationRef.current = undefined;
    cancelPendingSave();
    persistenceSuppressedRef.current = true;
    documentRef.current = null;
    await enqueueOperation(() => storeRef.current.clear());
  }, [cancelPendingSave, enqueueOperation]);

  const setPersistenceEnabled = useCallback(
    async (nextEnabled: boolean, values: ReadonlyMap<string, string> | null): Promise<void> => {
      operationGenerationRef.current += 1;
      restoreCancelledRef.current = true;
      restoredRenderGenerationRef.current = undefined;
      cancelPendingSave();
      persistenceEnabledRef.current = nextEnabled;
      persistenceSuppressedRef.current = !nextEnabled;

      if (!nextEnabled) {
        await enqueueOperation(() => storeRef.current.clear());
        return;
      }

      if (documentRef.current !== null && values !== null) persistValues(values);
    },
    [cancelPendingSave, enqueueOperation, persistValues],
  );

  return {
    beginDocumentSelection,
    invalidateRestoreCompletion,
    shouldApplyViewerStatus,
    activateDocument,
    persistValues,
    setPersistenceEnabled,
    closeDocument,
  };
}
