import { useCallback, useEffect, useRef, useState } from "react";
import { AppDialog } from "./AppDialog";
import { resetOfflineAppData } from "./app-data-reset";
import {
  readDocumentFile,
  UnsupportedDocumentFileError,
  type LoadedDocument,
} from "./document-file";
import {
  createDocfillyDocumentExport,
  createDocumentExport,
  downloadDocumentExport,
} from "./document-export";
import { DocumentViewer, type DocumentViewerHandle, type ViewerStatus } from "./DocumentViewer";
import { FileDropZone } from "./FileDropZone";
import { resolveWebLocale, webMessages, type WebLocale } from "./locale";
import { PwaUpdatePrompt } from "./PwaUpdatePrompt";
import { useDocumentPersistence } from "./use-document-persistence";
import { useDocumentWorkspace } from "./use-document-workspace";
import englishSample from "./samples/en.md?raw";
import japaneseSample from "./samples/ja.md?raw";

const samples: Record<WebLocale, LoadedDocument> = {
  en: { name: "docfilly-tutorial.md", source: englishSample, sourceType: "md" },
  ja: { name: "サンプル.md", source: japaneseSample, sourceType: "md" },
};

export function App() {
  const [locale, setLocale] = useState<WebLocale>(resolveWebLocale);
  const messages = webMessages[locale];
  const {
    state: { document, initialValues, outputSource, currentValues, isDocfilly, diagnostics },
    openDocument,
    updateRender,
    updateValues,
    prepareLocaleChange,
    closeDocument: resetDocumentWorkspace,
  } = useDocumentWorkspace();
  const [status, setStatus] = useState<ViewerStatus | null>(null);
  const [openDialog, setOpenDialog] = useState<"help" | "diagnostics" | null>(null);
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false);
  const [isResettingAppData, setIsResettingAppData] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentViewerRef = useRef<DocumentViewerHandle>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const overflowButtonRef = useRef<HTMLButtonElement>(null);
  const resetDataButtonRef = useRef<HTMLButtonElement>(null);
  const cancelResetButtonRef = useRef<HTMLButtonElement>(null);
  const restoreResetDataFocusRef = useRef(false);
  const resetInProgressRef = useRef(false);
  const fileLoadGenerationRef = useRef(0);

  const {
    beginDocumentSelection,
    invalidateRestoreCompletion,
    shouldApplyViewerStatus,
    activateDocument,
    persistValues,
    closeDocument: closePersistedDocument,
  } = useDocumentPersistence({
    onRestore: (session) => openDocument(session, session.values),
    onRestoreComplete: () => setStatus({ message: messages.restored, isWarning: false }),
    onRestoreFailure: () => setStatus({ message: messages.restoreFailed, isWarning: true }),
    onSaveFailure: () => setStatus({ message: messages.sessionSaveFailed, isWarning: true }),
  });

  useEffect(() => {
    globalThis.document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!isOverflowOpen) return;

    const closeFromOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !overflowRef.current?.contains(event.target)) {
        setIsOverflowOpen(false);
      }
    };
    const closeFromEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsOverflowOpen(false);
      overflowButtonRef.current?.focus();
    };

    globalThis.document.addEventListener("pointerdown", closeFromOutside);
    globalThis.document.addEventListener("keydown", closeFromEscape);
    return () => {
      globalThis.document.removeEventListener("pointerdown", closeFromOutside);
      globalThis.document.removeEventListener("keydown", closeFromEscape);
    };
  }, [isOverflowOpen]);

  useEffect(() => {
    if (isResetConfirmationOpen || !restoreResetDataFocusRef.current) return;
    restoreResetDataFocusRef.current = false;
    resetDataButtonRef.current?.focus();
  }, [isResetConfirmationOpen]);

  const invalidatePendingFileLoad = useCallback((): void => {
    fileLoadGenerationRef.current += 1;
  }, []);

  const showDocument = useCallback(
    (nextDocument: LoadedDocument): void => {
      invalidatePendingFileLoad();
      activateDocument(nextDocument);
      setStatus({ message: messages.loading, isWarning: false });
      openDocument(nextDocument);
    },
    [activateDocument, invalidatePendingFileLoad, messages.loading, openDocument],
  );

  const changeLocale = (nextLocale: WebLocale): void => {
    prepareLocaleChange();
    setStatus(null);
    setLocale(nextLocale);
  };

  const handleValuesChange = useCallback(
    (values: ReadonlyMap<string, string>): void => {
      updateValues(values);
      persistValues(values);
    },
    [persistValues, updateValues],
  );

  const handleViewerStatusChange = useCallback(
    (nextStatus: ViewerStatus): void => {
      if (shouldApplyViewerStatus()) setStatus(nextStatus);
    },
    [shouldApplyViewerStatus],
  );

  const resetAppData = useCallback(async (): Promise<void> => {
    if (resetInProgressRef.current) return;
    resetInProgressRef.current = true;
    invalidatePendingFileLoad();
    setIsResettingAppData(true);
    resetDocumentWorkspace();
    setIsOverflowOpen(false);

    try {
      const [documentCleanup, offlineCleanup] = await Promise.allSettled([
        closePersistedDocument(),
        resetOfflineAppData(),
      ]);
      const resetSucceeded =
        documentCleanup.status === "fulfilled" &&
        offlineCleanup.status === "fulfilled" &&
        offlineCleanup.value.success;
      setStatus({
        message: resetSucceeded ? messages.resetComplete : messages.resetFailed,
        isWarning: !resetSucceeded,
      });
    } finally {
      resetInProgressRef.current = false;
      setIsResettingAppData(false);
      setIsResetConfirmationOpen(false);
    }
  }, [
    closePersistedDocument,
    invalidatePendingFileLoad,
    messages.resetComplete,
    messages.resetFailed,
    resetDocumentWorkspace,
  ]);

  const closeDocument = useCallback(async (): Promise<void> => {
    if (document === null) return;
    invalidatePendingFileLoad();
    resetDocumentWorkspace();
    setOpenDialog(null);
    setIsOverflowOpen(false);

    try {
      await closePersistedDocument();
      setStatus({
        message: messages.closed,
        isWarning: false,
      });
    } catch {
      setStatus({
        message: messages.closeCleanupFailed,
        isWarning: true,
      });
    }
  }, [
    closePersistedDocument,
    document,
    invalidatePendingFileLoad,
    messages.closeCleanupFailed,
    messages.closed,
    resetDocumentWorkspace,
  ]);

  const loadFile = useCallback(
    async (file: File): Promise<void> => {
      const generation = ++fileLoadGenerationRef.current;

      try {
        const nextDocument = await readDocumentFile(file);
        if (generation !== fileLoadGenerationRef.current) return;
        beginDocumentSelection();
        showDocument(nextDocument);
      } catch (error) {
        if (generation !== fileLoadGenerationRef.current) return;
        invalidateRestoreCompletion();
        setStatus({
          message:
            error instanceof UnsupportedDocumentFileError
              ? messages.unsupportedFile
              : messages.fileReadFailed,
          isWarning: true,
        });
      }
    },
    [
      beginDocumentSelection,
      invalidateRestoreCompletion,
      messages.fileReadFailed,
      messages.unsupportedFile,
      showDocument,
    ],
  );

  const handleValidationError = useCallback(
    (message: string): void => {
      invalidatePendingFileLoad();
      invalidateRestoreCompletion();
      setStatus({ message, isWarning: true });
    },
    [invalidatePendingFileLoad, invalidateRestoreCompletion],
  );

  const openFilePicker = (): void => fileInputRef.current?.click();

  const openSample = (): void => {
    setOpenDialog(null);
    showDocument(samples[locale]);
  };

  const openResetConfirmation = (): void => {
    restoreResetDataFocusRef.current = true;
    setIsResetConfirmationOpen(true);
  };

  const closeResetConfirmation = (): void => {
    if (!resetInProgressRef.current) setIsResetConfirmationOpen(false);
  };

  const runOverflowAction = (action: () => void): void => {
    setIsOverflowOpen(false);
    overflowButtonRef.current?.focus();
    action();
  };

  const exportRenderedDocument = (): void => {
    if (document === null || outputSource === null) return;

    try {
      const latestOutputSource = documentViewerRef.current?.flush() ?? outputSource;
      const documentExport = createDocumentExport(
        latestOutputSource,
        document.sourceType,
        document.name,
      );
      downloadDocumentExport(documentExport);
      setStatus({
        message: messages.renderedExportStarted(documentExport.fileName),
        isWarning: false,
      });
    } catch {
      setStatus({
        message: messages.renderedExportFailed,
        isWarning: true,
      });
    }
  };

  const saveDocfillyDocument = (): void => {
    if (document === null || currentValues === null || !isDocfilly) return;

    try {
      const documentExport = createDocfillyDocumentExport(
        document.source,
        currentValues,
        document.sourceType,
        document.name,
        locale,
      );
      downloadDocumentExport(documentExport);
      setStatus({
        message: messages.docfillySaveStarted(documentExport.fileName),
        isWarning: false,
      });
    } catch {
      setStatus({
        message: messages.docfillySaveFailed,
        isWarning: true,
      });
    }
  };

  return (
    <div className="app-shell">
      <header className="toolbar">
        <a className="toolbar__brand" href="./" aria-label={messages.home}>
          Docfilly
        </a>
        <div className="toolbar__document" aria-live="polite">
          <span>{messages.viewing}</span>
          <strong title={document?.name}>{document?.name ?? messages.noFileSelected}</strong>
        </div>
        <nav className="toolbar__actions" aria-label={messages.documentActions}>
          <label className="language-picker">
            <span className="visually-hidden">{messages.language}</span>
            <select
              aria-label={messages.language}
              value={locale}
              onChange={(event) => changeLocale(event.currentTarget.value as WebLocale)}
            >
              <option value="en">{messages.english}</option>
              <option value="ja">{messages.japanese}</option>
            </select>
          </label>
          <FileDropZone
            inputRef={fileInputRef}
            onFile={loadFile}
            onValidationError={handleValidationError}
            messages={messages}
          />
          <button
            type="button"
            className="toolbar-button secondary-action"
            disabled={!isDocfilly || currentValues === null}
            onClick={saveDocfillyDocument}
          >
            {messages.saveDocfilly}
          </button>
          <button
            type="button"
            className="toolbar-button secondary-action"
            disabled={outputSource === null}
            onClick={exportRenderedDocument}
          >
            {messages.exportRendered}
          </button>
          <button
            type="button"
            className="toolbar-button secondary-action"
            disabled={document === null}
            onClick={() => void closeDocument()}
          >
            {messages.closeDocument}
          </button>
          {diagnostics.length > 0 && (
            <button
              type="button"
              className="toolbar-button diagnostic-action secondary-action"
              onClick={() => setOpenDialog("diagnostics")}
            >
              {messages.diagnostics(diagnostics.length)}
            </button>
          )}
          <button
            type="button"
            className="toolbar-button secondary-action"
            onClick={() => setOpenDialog("help")}
          >
            {messages.help}
          </button>
          <div ref={overflowRef} className="toolbar-overflow">
            <button
              ref={overflowButtonRef}
              type="button"
              className="toolbar-button toolbar-overflow__trigger"
              aria-label={messages.moreActions}
              aria-expanded={isOverflowOpen}
              aria-controls="toolbar-overflow-menu"
              title={messages.moreActions}
              onClick={() => setIsOverflowOpen((isOpen) => !isOpen)}
            >
              <span aria-hidden="true">⋮</span>
            </button>
            {isOverflowOpen && (
              <div id="toolbar-overflow-menu" className="toolbar-overflow__menu">
                <button
                  type="button"
                  disabled={!isDocfilly || currentValues === null}
                  onClick={() => runOverflowAction(saveDocfillyDocument)}
                >
                  {messages.saveDocfilly}
                </button>
                <button
                  type="button"
                  disabled={outputSource === null}
                  onClick={() => runOverflowAction(exportRenderedDocument)}
                >
                  {messages.exportRendered}
                </button>
                <button
                  type="button"
                  disabled={document === null}
                  onClick={() => runOverflowAction(() => void closeDocument())}
                >
                  {messages.closeDocument}
                </button>
                {diagnostics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => runOverflowAction(() => setOpenDialog("diagnostics"))}
                  >
                    {messages.diagnostics(diagnostics.length)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => runOverflowAction(() => setOpenDialog("help"))}
                >
                  {messages.help}
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      {status !== null && (
        <div className={`app-status${status.isWarning ? " is-warning" : ""}`} role="status">
          {status.message}
        </div>
      )}

      <PwaUpdatePrompt messages={messages} />

      <main className={document === null ? "empty-layout" : undefined}>
        {document === null ? (
          <section className="empty-state" aria-labelledby="empty-state-title">
            <p className="eyebrow">{messages.emptyEyebrow}</p>
            <h1 id="empty-state-title">{messages.emptyTitle}</h1>
            <p>{messages.emptyDescription}</p>
            <div className="empty-state__actions">
              <button type="button" className="primary-button" onClick={openFilePicker}>
                {messages.openFile}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => showDocument(samples[locale])}
              >
                {messages.openSample}
              </button>
            </div>
            <small>
              {messages.supportedFiles} {messages.filesStayLocal}
            </small>
          </section>
        ) : (
          <DocumentViewer
            ref={documentViewerRef}
            source={document.source}
            sourceType={document.sourceType}
            initialValues={initialValues}
            locale={locale}
            messages={messages}
            onStatusChange={handleViewerStatusChange}
            onRenderStateChange={updateRender}
            onValuesChange={handleValuesChange}
          />
        )}
      </main>

      {openDialog === "help" && (
        <AppDialog
          title={messages.helpTitle}
          closeLabel={messages.closeDialog(messages.helpTitle)}
          inactive={isResetConfirmationOpen}
          onClose={() => setOpenDialog(null)}
        >
          <section>
            <h3>{messages.helpIntroduction.heading}</h3>
            <p>{messages.helpIntroduction.body}</p>
          </section>
          <section>
            <h3>{messages.helpSample.heading}</h3>
            <p>{messages.helpSample.body}</p>
            <div className="help-actions">
              <button type="button" className="text-button" onClick={openSample}>
                {messages.sampleDocument}
              </button>
              <a
                href="https://github.com/haiix/Docfilly/blob/main/documents/03-source-format.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                {messages.formatSpecification}
              </a>
            </div>
          </section>
          <section>
            <h3>{messages.helpOpen.heading}</h3>
            <p>{messages.helpOpen.body}</p>
          </section>
          <section>
            <h3>{messages.helpForm.heading}</h3>
            <p>{messages.helpForm.body}</p>
          </section>
          <section>
            <h3>{messages.helpSave.heading}</h3>
            <p>{messages.helpSave.body}</p>
          </section>
          <section>
            <h3>{messages.helpExport.heading}</h3>
            <p>{messages.helpExport.body}</p>
          </section>
          <section>
            <h3>{messages.helpPrivacy.heading}</h3>
            <p>{messages.helpPrivacy.body}</p>
            <button
              ref={resetDataButtonRef}
              type="button"
              className="text-button danger-action"
              onClick={openResetConfirmation}
            >
              {messages.resetAppData}
            </button>
          </section>
        </AppDialog>
      )}

      {isResetConfirmationOpen && (
        <AppDialog
          title={messages.resetTitle}
          closeLabel={messages.closeDialog(messages.resetTitle)}
          initialFocusRef={cancelResetButtonRef}
          busy={isResettingAppData}
          onClose={closeResetConfirmation}
        >
          <p>{messages.resetDescription}</p>
          <p>{messages.resetSafety}</p>
          <div className="dialog-actions">
            <button
              ref={cancelResetButtonRef}
              type="button"
              className="toolbar-button dialog-cancel-action"
              disabled={isResettingAppData}
              onClick={closeResetConfirmation}
            >
              {messages.cancel}
            </button>
            <button
              type="button"
              className="toolbar-button danger-action"
              disabled={isResettingAppData}
              onClick={() => void resetAppData()}
            >
              {messages.confirmResetAppData}
            </button>
          </div>
        </AppDialog>
      )}

      {openDialog === "diagnostics" && diagnostics.length > 0 && (
        <AppDialog
          title={messages.diagnosticsTitle(diagnostics.length)}
          closeLabel={messages.closeDialog(messages.diagnosticsTitle(diagnostics.length))}
          onClose={() => setOpenDialog(null)}
        >
          <p className="diagnostic-summary">{messages.diagnosticsSummary}</p>
          <ol className="diagnostic-list">
            {diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${diagnostic.line ?? "unknown"}-${index}`}>
                <p>{diagnostic.message}</p>
                <dl>
                  {diagnostic.line !== undefined && (
                    <>
                      <dt>{messages.line}</dt>
                      <dd>{diagnostic.line}</dd>
                    </>
                  )}
                  {diagnostic.source !== undefined && (
                    <>
                      <dt>{messages.source}</dt>
                      <dd>
                        <code>{diagnostic.source}</code>
                      </dd>
                    </>
                  )}
                </dl>
              </li>
            ))}
          </ol>
        </AppDialog>
      )}
    </div>
  );
}
