import { useCallback, useEffect, useRef, useState } from "react";
import type { DocfillyDiagnostic } from "docfilly";
import { AppDialog } from "./AppDialog";
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
import { DocumentViewer, type ViewerStatus } from "./DocumentViewer";
import { FileDropZone } from "./FileDropZone";
import { clearDocumentSession, loadDocumentSession, saveDocumentSession } from "./document-session";
import { resolveWebLocale, webMessages, type WebLocale } from "./locale";
import englishSample from "./samples/en.md?raw";
import japaneseSample from "./samples/ja.md?raw";

const samples: Record<WebLocale, LoadedDocument> = {
  en: { name: "docfilly-tutorial.md", source: englishSample, sourceType: "md" },
  ja: { name: "サンプル.md", source: japaneseSample, sourceType: "md" },
};

const sessionSaveDelayMs = 500;

export function App() {
  const [locale, setLocale] = useState<WebLocale>(resolveWebLocale);
  const messages = webMessages[locale];
  const initialLocaleRef = useRef(locale);
  const initialMessagesRef = useRef(messages);
  const [document, setDocument] = useState<LoadedDocument | null>(null);
  const [initialValues, setInitialValues] = useState<ReadonlyMap<string, string> | undefined>();
  const [outputSource, setOutputSource] = useState<string | null>(null);
  const [currentValues, setCurrentValues] = useState<ReadonlyMap<string, string> | null>(null);
  const [isDocfilly, setIsDocfilly] = useState(false);
  const [status, setStatus] = useState<ViewerStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<readonly DocfillyDiagnostic[]>([]);
  const [openDialog, setOpenDialog] = useState<"help" | "diagnostics" | null>(null);
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const overflowButtonRef = useRef<HTMLButtonElement>(null);
  const clearDataButtonRef = useRef<HTMLButtonElement>(null);
  const cancelClearButtonRef = useRef<HTMLButtonElement>(null);
  const documentRef = useRef<LoadedDocument | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoredNoticeRef = useRef(false);
  const restoreCancelledRef = useRef(false);
  const persistenceSuppressedRef = useRef(false);
  const restoreClearDataFocusRef = useRef(false);

  useEffect(() => {
    globalThis.document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    let active = true;
    void loadDocumentSession()
      .then((session) => {
        if (!active || restoreCancelledRef.current || session === null) return;
        let restoredDocument: LoadedDocument = {
          name: session.name,
          source: session.source,
          sourceType: session.sourceType,
        };
        if (
          Object.values(samples).some(
            (sample) => sample.name === session.name && sample.source === session.source,
          )
        ) {
          restoredDocument = samples[initialLocaleRef.current];
        }
        documentRef.current = restoredDocument;
        restoredNoticeRef.current = true;
        setInitialValues(session.values);
        setDocument(restoredDocument);
      })
      .catch(() => {
        if (!active) return;
        setStatus({
          message: initialMessagesRef.current.restoreFailed,
          isWarning: true,
        });
      });

    return () => {
      active = false;
      if (saveTimerRef.current !== undefined) clearTimeout(saveTimerRef.current);
    };
  }, []);

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
    if (isClearConfirmationOpen || !restoreClearDataFocusRef.current) return;
    restoreClearDataFocusRef.current = false;
    clearDataButtonRef.current?.focus();
  }, [isClearConfirmationOpen]);

  const showDocument = useCallback(
    (nextDocument: LoadedDocument): void => {
      if (saveTimerRef.current !== undefined) clearTimeout(saveTimerRef.current);
      restoreCancelledRef.current = true;
      documentRef.current = nextDocument;
      persistenceSuppressedRef.current = false;
      setStatus({ message: messages.loading, isWarning: false });
      setOutputSource(null);
      setCurrentValues(null);
      setIsDocfilly(false);
      setDiagnostics([]);
      setInitialValues(undefined);
      setDocument(nextDocument);
    },
    [messages.loading],
  );

  const changeLocale = (nextLocale: WebLocale): void => {
    const currentDocument = documentRef.current;
    const isBuiltInSample = Object.values(samples).some(
      (sample) => currentDocument?.name === sample.name && currentDocument.source === sample.source,
    );
    setStatus(null);
    setLocale(nextLocale);
    if (isBuiltInSample) showDocument(samples[nextLocale]);
  };

  const handleValuesChange = useCallback(
    (values: ReadonlyMap<string, string>): void => {
      setCurrentValues(new Map(values));
      if (restoredNoticeRef.current) {
        restoredNoticeRef.current = false;
        setStatus({ message: messages.restored, isWarning: false });
        return;
      }
      if (persistenceSuppressedRef.current || documentRef.current === null) return;
      if (saveTimerRef.current !== undefined) clearTimeout(saveTimerRef.current);
      const documentToSave = documentRef.current;
      const valuesToSave = new Map(values);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = undefined;
        void saveDocumentSession(documentToSave, valuesToSave).catch(() => {
          setStatus({
            message: messages.sessionSaveFailed,
            isWarning: true,
          });
        });
      }, sessionSaveDelayMs);
    },
    [messages.restored, messages.sessionSaveFailed],
  );

  const clearSavedDocument = useCallback(async (): Promise<void> => {
    restoreCancelledRef.current = true;
    if (saveTimerRef.current !== undefined) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = undefined;
    }
    persistenceSuppressedRef.current = true;
    try {
      await clearDocumentSession();
      setIsClearConfirmationOpen(false);
      setStatus({
        message: messages.cleared,
        isWarning: false,
      });
    } catch {
      persistenceSuppressedRef.current = false;
      setStatus({
        message: messages.clearFailed,
        isWarning: true,
      });
    }
  }, [messages.clearFailed, messages.cleared]);

  const closeDocument = useCallback(async (): Promise<void> => {
    if (documentRef.current === null) return;
    restoreCancelledRef.current = true;
    restoredNoticeRef.current = false;
    if (saveTimerRef.current !== undefined) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = undefined;
    }
    persistenceSuppressedRef.current = true;
    documentRef.current = null;
    setDocument(null);
    setInitialValues(undefined);
    setOutputSource(null);
    setCurrentValues(null);
    setIsDocfilly(false);
    setDiagnostics([]);
    setOpenDialog(null);
    setIsOverflowOpen(false);

    try {
      await clearDocumentSession();
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
  }, [messages.closeCleanupFailed, messages.closed]);

  const loadFile = useCallback(
    async (file: File): Promise<void> => {
      try {
        showDocument(await readDocumentFile(file));
      } catch (error) {
        setStatus({
          message:
            error instanceof UnsupportedDocumentFileError
              ? messages.unsupportedFile
              : messages.fileReadFailed,
          isWarning: true,
        });
      }
    },
    [messages.fileReadFailed, messages.unsupportedFile, showDocument],
  );

  const handleValidationError = useCallback((message: string): void => {
    setStatus({ message, isWarning: true });
  }, []);

  const openFilePicker = (): void => fileInputRef.current?.click();

  const openSample = (): void => {
    setOpenDialog(null);
    showDocument(samples[locale]);
  };

  const openClearConfirmation = (): void => {
    restoreClearDataFocusRef.current = true;
    setIsClearConfirmationOpen(true);
  };

  const closeClearConfirmation = (): void => setIsClearConfirmationOpen(false);

  const runOverflowAction = (action: () => void): void => {
    setIsOverflowOpen(false);
    overflowButtonRef.current?.focus();
    action();
  };

  const exportRenderedDocument = (): void => {
    if (document === null || outputSource === null) return;

    try {
      const documentExport = createDocumentExport(outputSource, document.sourceType, document.name);
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
            source={document.source}
            sourceType={document.sourceType}
            initialValues={initialValues}
            locale={locale}
            messages={messages}
            onStatusChange={setStatus}
            onOutputSourceChange={setOutputSource}
            onDiagnosticsChange={setDiagnostics}
            onValuesChange={handleValuesChange}
            onDocumentTypeChange={setIsDocfilly}
          />
        )}
      </main>

      {openDialog === "help" && (
        <AppDialog
          title={messages.helpTitle}
          closeLabel={messages.closeDialog(messages.helpTitle)}
          inactive={isClearConfirmationOpen}
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
              ref={clearDataButtonRef}
              type="button"
              className="text-button danger-action"
              onClick={openClearConfirmation}
            >
              {messages.clearDeviceData}
            </button>
          </section>
        </AppDialog>
      )}

      {isClearConfirmationOpen && (
        <AppDialog
          title={messages.clearTitle}
          closeLabel={messages.closeDialog(messages.clearTitle)}
          initialFocusRef={cancelClearButtonRef}
          onClose={closeClearConfirmation}
        >
          <p>{messages.clearDescription}</p>
          <p>{messages.clearSafety}</p>
          <div className="dialog-actions">
            <button
              ref={cancelClearButtonRef}
              type="button"
              className="toolbar-button dialog-cancel-action"
              onClick={closeClearConfirmation}
            >
              {messages.cancel}
            </button>
            <button
              type="button"
              className="toolbar-button danger-action"
              onClick={() => void clearSavedDocument()}
            >
              {messages.clearSavedData}
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
