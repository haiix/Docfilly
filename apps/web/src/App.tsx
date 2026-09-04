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
import { applyTheme, resolvePreferredTheme } from "./theme";
import { useDocumentPersistence } from "./use-document-persistence";
import { useDocumentWorkspace } from "./use-document-workspace";
import {
  clearUserPreferences,
  readUserPreferences,
  resolvePreferredLocale,
  writeUserPreferences,
  type LanguagePreference,
  type ThemePreference,
} from "./user-preferences";
import englishSample from "./samples/en.md?raw";
import japaneseSample from "./samples/ja.md?raw";

const samples: Record<WebLocale, LoadedDocument> = {
  en: { name: "docfilly-tutorial.md", source: englishSample, sourceType: "md" },
  ja: { name: "サンプル.md", source: japaneseSample, sourceType: "md" },
};

export function App() {
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>(
    () => readUserPreferences().language,
  );
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    () => readUserPreferences().theme,
  );
  const [restoreDocument, setRestoreDocument] = useState(
    () => readUserPreferences().restoreDocument,
  );
  const [locale, setLocale] = useState<WebLocale>(() => resolvePreferredLocale(languagePreference));
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
  const [openDialog, setOpenDialog] = useState<"settings" | "help" | "diagnostics" | null>(null);
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false);
  const [isResettingAppData, setIsResettingAppData] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const toolbarRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentViewerRef = useRef<DocumentViewerHandle>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const overflowButtonRef = useRef<HTMLButtonElement>(null);
  const resetDataButtonRef = useRef<HTMLButtonElement>(null);
  const cancelResetButtonRef = useRef<HTMLButtonElement>(null);
  const restoreResetDataFocusRef = useRef(false);
  const resetInProgressRef = useRef(false);
  const fileLoadGenerationRef = useRef(0);
  const persistencePreferenceGenerationRef = useRef(0);
  const viewerStatusOverrideRef = useRef<ViewerStatus | null>(null);

  const {
    beginDocumentSelection,
    invalidateRestoreCompletion,
    shouldApplyViewerStatus,
    activateDocument,
    persistValues,
    setPersistenceEnabled,
    closeDocument: closePersistedDocument,
  } = useDocumentPersistence({
    enabled: restoreDocument,
    onRestore: (session) => openDocument(session, session.values),
    onRestoreComplete: () => setStatus({ message: messages.restored, isWarning: false }),
    onRestoreFailure: () => setStatus({ message: messages.restoreFailed, isWarning: true }),
    onSaveFailure: () => setStatus({ message: messages.sessionSaveFailed, isWarning: true }),
    onClearFailure: () => setStatus({ message: messages.restoreCleanupFailed, isWarning: true }),
  });

  useEffect(() => {
    globalThis.document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (toolbar === null) return;

    const documentElement = globalThis.document.documentElement;
    const updateToolbarHeight = (): void => {
      documentElement.style.setProperty("--app-toolbar-height", `${toolbar.offsetHeight}px`);
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateToolbarHeight);

    updateToolbarHeight();
    resizeObserver?.observe(toolbar);
    globalThis.addEventListener("resize", updateToolbarHeight);
    globalThis.visualViewport?.addEventListener("resize", updateToolbarHeight);

    return () => {
      resizeObserver?.disconnect();
      globalThis.removeEventListener("resize", updateToolbarHeight);
      globalThis.visualViewport?.removeEventListener("resize", updateToolbarHeight);
      documentElement.style.removeProperty("--app-toolbar-height");
    };
  }, []);

  useEffect(() => {
    const colorScheme =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    const updateTheme = (): void => {
      applyTheme(resolvePreferredTheme(themePreference, colorScheme?.matches ?? false));
    };

    updateTheme();
    if (themePreference !== "system" || colorScheme === null) return;
    colorScheme.addEventListener("change", updateTheme);
    return () => colorScheme.removeEventListener("change", updateTheme);
  }, [themePreference]);

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
      viewerStatusOverrideRef.current = null;
      setStatus({ message: messages.loading, isWarning: false });
      openDocument(nextDocument);
    },
    [activateDocument, invalidatePendingFileLoad, messages.loading, openDocument],
  );

  const changeLanguagePreference = (nextPreference: LanguagePreference): void => {
    const nextLocale = resolvePreferredLocale(nextPreference);
    if (nextLocale !== locale) prepareLocaleChange();
    setLanguagePreference(nextPreference);
    setLocale(nextLocale);
    const preferenceStatus = writeUserPreferences({
      language: nextPreference,
      theme: themePreference,
      restoreDocument,
    })
      ? null
      : { message: webMessages[nextLocale].preferenceSaveFailed, isWarning: true };
    viewerStatusOverrideRef.current = preferenceStatus;
    setStatus(preferenceStatus);
  };

  const changeThemePreference = (nextPreference: ThemePreference): void => {
    setThemePreference(nextPreference);
    const preferenceStatus = writeUserPreferences({
      language: languagePreference,
      theme: nextPreference,
      restoreDocument,
    })
      ? null
      : { message: messages.preferenceSaveFailed, isWarning: true };
    viewerStatusOverrideRef.current = preferenceStatus;
    setStatus(preferenceStatus);
  };

  const changeRestoreDocument = async (nextRestoreDocument: boolean): Promise<void> => {
    const generation = ++persistencePreferenceGenerationRef.current;
    setRestoreDocument(nextRestoreDocument);
    const preferencesSaved = writeUserPreferences({
      language: languagePreference,
      theme: themePreference,
      restoreDocument: nextRestoreDocument,
    });

    try {
      await setPersistenceEnabled(nextRestoreDocument, currentValues);
      if (generation !== persistencePreferenceGenerationRef.current) return;
      const preferenceStatus = preferencesSaved
        ? null
        : { message: messages.preferenceSaveFailed, isWarning: true };
      viewerStatusOverrideRef.current = preferenceStatus;
      setStatus(preferenceStatus);
    } catch {
      if (generation !== persistencePreferenceGenerationRef.current) return;
      const cleanupStatus = { message: messages.restoreCleanupFailed, isWarning: true };
      viewerStatusOverrideRef.current = cleanupStatus;
      setStatus(cleanupStatus);
    }
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
      if (shouldApplyViewerStatus() && viewerStatusOverrideRef.current === null) {
        setStatus(nextStatus);
      }
    },
    [shouldApplyViewerStatus],
  );

  const resetAppData = useCallback(async (): Promise<void> => {
    if (resetInProgressRef.current) return;
    resetInProgressRef.current = true;
    viewerStatusOverrideRef.current = null;
    persistencePreferenceGenerationRef.current += 1;
    invalidatePendingFileLoad();
    setIsResettingAppData(true);
    resetDocumentWorkspace();
    setIsOverflowOpen(false);

    try {
      const preferencesCleared = clearUserPreferences();
      const browserLocale = resolveWebLocale();
      setLanguagePreference("browser");
      setThemePreference("system");
      setRestoreDocument(true);
      setLocale(browserLocale);
      const [documentCleanup, offlineCleanup] = await Promise.allSettled([
        closePersistedDocument(),
        resetOfflineAppData(),
      ]);
      await setPersistenceEnabled(true, null);
      const resetSucceeded =
        preferencesCleared &&
        documentCleanup.status === "fulfilled" &&
        offlineCleanup.status === "fulfilled" &&
        offlineCleanup.value.success;
      setStatus({
        message: resetSucceeded
          ? webMessages[browserLocale].resetComplete
          : webMessages[browserLocale].resetFailed,
        isWarning: !resetSucceeded,
      });
      if (resetSucceeded) setOpenDialog(null);
    } finally {
      resetInProgressRef.current = false;
      setIsResettingAppData(false);
      setIsResetConfirmationOpen(false);
    }
  }, [
    closePersistedDocument,
    invalidatePendingFileLoad,
    resetDocumentWorkspace,
    setPersistenceEnabled,
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
      <header ref={toolbarRef} className="toolbar">
        <a className="toolbar__brand" href="./" aria-label={messages.home}>
          Docfilly
        </a>
        <div className="toolbar__document" aria-live="polite">
          <span>{messages.viewing}</span>
          <strong title={document?.name}>{document?.name ?? messages.noFileSelected}</strong>
        </div>
        <nav className="toolbar__actions" aria-label={messages.documentActions}>
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
            onClick={() => setOpenDialog("settings")}
          >
            {messages.settings}
          </button>
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
                  onClick={() => runOverflowAction(() => setOpenDialog("settings"))}
                >
                  {messages.settings}
                </button>
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

      {openDialog === "settings" && (
        <AppDialog
          title={messages.settingsTitle}
          closeLabel={messages.closeDialog(messages.settingsTitle)}
          inactive={isResetConfirmationOpen}
          onClose={() => setOpenDialog(null)}
        >
          <section>
            <h3>{messages.displaySettings}</h3>
            <p>{messages.languageDescription}</p>
            <label className="settings-field">
              <span>{messages.language}</span>
              <select
                value={languagePreference}
                onChange={(event) =>
                  changeLanguagePreference(event.currentTarget.value as LanguagePreference)
                }
              >
                <option value="browser">{messages.browserLanguage}</option>
                <option value="ja">{messages.japanese}</option>
                <option value="en">{messages.english}</option>
              </select>
            </label>
            <p>{messages.themeDescription}</p>
            <label className="settings-field">
              <span>{messages.theme}</span>
              <select
                value={themePreference}
                onChange={(event) =>
                  changeThemePreference(event.currentTarget.value as ThemePreference)
                }
              >
                <option value="system">{messages.systemTheme}</option>
                <option value="light">{messages.lightTheme}</option>
                <option value="dark">{messages.darkTheme}</option>
              </select>
            </label>
          </section>
          <section>
            <h3>{messages.documentSettings}</h3>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={restoreDocument}
                aria-describedby="restore-document-description"
                onChange={(event) => void changeRestoreDocument(event.currentTarget.checked)}
              />
              <span>{messages.restorePreviousDocument}</span>
            </label>
            <p id="restore-document-description">{messages.restorePreviousDocumentDescription}</p>
          </section>
          <section>
            <h3>{messages.dataPrivacySettings}</h3>
            <p>{messages.storedDataDescription}</p>
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
