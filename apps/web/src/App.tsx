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

const sampleSource = `#!docfilly
> フォームの値を自由に変更してみてください。
project_name | プロジェクト名 = Docfilly
environment | 実行環境 = [development, *staging, production]
author | 作成者 = 山田太郎
team_work | チームで作業する = [x]

---

# [[project_name]] 5分チュートリアル

まずは左のフォームを変更して、右の本文がその場で変わることを試してください。

Docfillyは、通常のMarkdown／テキストに少数の構文を追加し、文書の読み替えを支援するためのドキュメントフォーマットです。

## 基本構造

Docfilly文書は、先頭行に\`#!docfilly\`を書き、\`---\`の区切り線より前に**フォーム設定**、後ろに**本文テンプレート**を書きます。

\`\`\`
#!docfilly

(フォーム設定)

---

(本文テンプレート)
\`\`\`

このサンプル自体も、この記法に従って書かれています。

## 1. テキストを差し込む

「プロジェクト名」のフォームは、ソースの次の行から作られます。

\`\`\`text
project_name | プロジェクト名 = Docfilly
# または
プロジェクト名 = Docfilly
\`\`\`

左から「変数名 | ラベル = 初期値」です。\`| ラベル\`は省略でき、その場合は変数名がフォームのラベルになります。変数名には日本語も使えます。本文に変数名を二重角括弧（\`\\[[変数名]]\`）で書くと、入力した値に置き換わります。

\`\`\`text
\\[[project_name]]
# または
\\[[プロジェクト名]]
\`\`\`

> 現在のプロジェクト名は **[[project_name]]** です。

> 作成者: **[[author]]**

## 2. 選択肢で表示を変える

「実行環境」はドロップダウンです。角括弧内に選択肢を並べ、\`*\`を付けた項目を初期選択にします。

\`\`\`text
environment | 実行環境 = [development, *staging, production]
\`\`\`

> 現在の選択: **[[environment]]**

[[#if environment = development]]
> 開発用の設定で、手元の変更をすぐ確認できます。
[[#endif]]
[[#if environment = staging]]
> ステージング環境で、本番前の動作を確認します。
[[#endif]]
[[#if environment = production]]
> 本番環境です。変更前にレビューとバックアップを確認してください。
[[#endif]]

## 3. チェックで手順を切り替える

\`[x]\`はON、\`[ ]\`はOFFのチェックボックスを作ります。本文では値を\`true\`／\`false\`と表示する代わりに、条件分岐で必要な手順だけを見せられます。

\`\`\`text
team_work | チームで作業する = [x]

\\[[#if team_work]]
### チームで作業する場合

1. 作業ブランチを作成します。
2. 変更後にレビューを依頼します。
\\[[#else]]
### 個人で作業する場合

1. 手元で変更内容を確認します。
2. 作業内容を記録します。
\\[[#endif]]
\`\`\`

[[#if team_work]]
> ### チームで作業する場合
>
> 1. 作業ブランチを作成します。
> 2. 変更後にレビューを依頼します。
[[#else]]
> ### 個人で作業する場合
>
> 1. 手元で変更内容を確認します。
> 2. 作業内容を記録します。
[[#endif]]

## 次は自分の文書で試す

1. ツールバーの「Docfilly形式で保存」で、このソースをダウンロードします。
2. 保存したファイルをテキストエディターで開き、フォーム設定や本文を編集します。
3. ツールバーの「ファイルを開く」から、編集したファイルをもう一度開きます。

すべての記法は[詳細なDocfillyフォーマット仕様](https://github.com/haiix/Docfilly/blob/main/documents/03-source-format.md)で確認できます。
`;

const sampleDocument: LoadedDocument = {
  name: "サンプル.md",
  source: sampleSource,
  sourceType: "md",
};

const loadingStatus: ViewerStatus = {
  message: "文書を読み込んでいます。",
  isWarning: false,
};

const sessionSaveDelayMs = 500;

export function App() {
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
    let active = true;
    void loadDocumentSession()
      .then((session) => {
        if (!active || restoreCancelledRef.current || session === null) return;
        const restoredDocument: LoadedDocument = {
          name: session.name,
          source: session.source,
          sourceType: session.sourceType,
        };
        documentRef.current = restoredDocument;
        restoredNoticeRef.current = true;
        setInitialValues(session.values);
        setDocument(restoredDocument);
      })
      .catch(() => {
        if (!active) return;
        setStatus({
          message: "この端末の保存データを読み込めませんでした。新しい文書を開けます。",
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

  const showDocument = useCallback((nextDocument: LoadedDocument): void => {
    if (saveTimerRef.current !== undefined) clearTimeout(saveTimerRef.current);
    restoreCancelledRef.current = true;
    documentRef.current = nextDocument;
    persistenceSuppressedRef.current = false;
    setStatus(loadingStatus);
    setOutputSource(null);
    setCurrentValues(null);
    setIsDocfilly(false);
    setDiagnostics([]);
    setInitialValues(undefined);
    setDocument(nextDocument);
  }, []);

  const handleValuesChange = useCallback((values: ReadonlyMap<string, string>): void => {
    setCurrentValues(new Map(values));
    if (restoredNoticeRef.current) {
      restoredNoticeRef.current = false;
      setStatus({ message: "前回の文書を復元しました。", isWarning: false });
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
          message: "この端末へ文書データを保存できませんでした。表示中の文書は維持されています。",
          isWarning: true,
        });
      });
    }, sessionSaveDelayMs);
  }, []);

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
        message: "この端末に保存した文書データを削除しました。表示中の文書は維持されています。",
        isWarning: false,
      });
    } catch {
      persistenceSuppressedRef.current = false;
      setStatus({
        message: "この端末の保存データを削除できませんでした。",
        isWarning: true,
      });
    }
  }, []);

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
        message: "文書を閉じました。元のローカルファイルは変更されていません。",
        isWarning: false,
      });
    } catch {
      setStatus({
        message:
          "文書を閉じましたが、この端末の復元データを削除できませんでした。再読み込み時に文書が復元される可能性があります。",
        isWarning: true,
      });
    }
  }, []);

  const loadFile = useCallback(
    async (file: File): Promise<void> => {
      try {
        showDocument(await readDocumentFile(file));
      } catch (error) {
        setStatus({
          message:
            error instanceof UnsupportedDocumentFileError
              ? error.message
              : "ファイルを読み込めませんでした。もう一度選択してください。",
          isWarning: true,
        });
      }
    },
    [showDocument],
  );

  const handleValidationError = useCallback((message: string): void => {
    setStatus({ message, isWarning: true });
  }, []);

  const openFilePicker = (): void => fileInputRef.current?.click();

  const openSample = (): void => {
    setOpenDialog(null);
    showDocument(sampleDocument);
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
        message: `表示結果「${documentExport.fileName}」の書き出しを開始しました。`,
        isWarning: false,
      });
    } catch {
      setStatus({
        message: "表示結果を書き出せませんでした。文書はそのまま表示されています。",
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
      );
      downloadDocumentExport(documentExport);
      setStatus({
        message: `Docfilly文書「${documentExport.fileName}」の保存を開始しました。`,
        isWarning: false,
      });
    } catch {
      setStatus({
        message: "Docfilly形式で保存できませんでした。文書とフォーム値は維持されています。",
        isWarning: true,
      });
    }
  };

  return (
    <div className="app-shell">
      <header className="toolbar">
        <a className="toolbar__brand" href="./" aria-label="Docfilly ホーム">
          Docfilly
        </a>
        <div className="toolbar__document" aria-live="polite">
          <span>表示中</span>
          <strong title={document?.name}>{document?.name ?? "ファイル未選択"}</strong>
        </div>
        <nav className="toolbar__actions" aria-label="文書操作">
          <FileDropZone
            inputRef={fileInputRef}
            onFile={loadFile}
            onValidationError={handleValidationError}
          />
          <button
            type="button"
            className="toolbar-button secondary-action"
            disabled={!isDocfilly || currentValues === null}
            onClick={saveDocfillyDocument}
          >
            Docfilly形式で保存
          </button>
          <button
            type="button"
            className="toolbar-button secondary-action"
            disabled={outputSource === null}
            onClick={exportRenderedDocument}
          >
            表示結果を書き出す
          </button>
          <button
            type="button"
            className="toolbar-button secondary-action"
            disabled={document === null}
            onClick={() => void closeDocument()}
          >
            文書を閉じる
          </button>
          {diagnostics.length > 0 && (
            <button
              type="button"
              className="toolbar-button diagnostic-action secondary-action"
              onClick={() => setOpenDialog("diagnostics")}
            >
              診断 {diagnostics.length}件
            </button>
          )}
          <button
            type="button"
            className="toolbar-button secondary-action"
            onClick={() => setOpenDialog("help")}
          >
            ヘルプ
          </button>
          <div ref={overflowRef} className="toolbar-overflow">
            <button
              ref={overflowButtonRef}
              type="button"
              className="toolbar-button toolbar-overflow__trigger"
              aria-label="その他の操作"
              aria-expanded={isOverflowOpen}
              aria-controls="toolbar-overflow-menu"
              title="その他の操作"
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
                  Docfilly形式で保存
                </button>
                <button
                  type="button"
                  disabled={outputSource === null}
                  onClick={() => runOverflowAction(exportRenderedDocument)}
                >
                  表示結果を書き出す
                </button>
                <button
                  type="button"
                  disabled={document === null}
                  onClick={() => runOverflowAction(() => void closeDocument())}
                >
                  文書を閉じる
                </button>
                {diagnostics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => runOverflowAction(() => setOpenDialog("diagnostics"))}
                  >
                    診断 {diagnostics.length}件
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => runOverflowAction(() => setOpenDialog("help"))}
                >
                  ヘルプ
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
            <p className="eyebrow">Local document viewer</p>
            <h1 id="empty-state-title">Docfilly文書を開く</h1>
            <p>
              Markdownまたはテキストファイルをブラウザー内で読み込み、フォームから内容を変更できます。
            </p>
            <div className="empty-state__actions">
              <button type="button" className="primary-button" onClick={openFilePicker}>
                ファイルを開く
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => showDocument(sampleDocument)}
              >
                サンプルを開く
              </button>
            </div>
            <small>.md、.markdown、.txt に対応。ファイルは外部へ送信されません。</small>
          </section>
        ) : (
          <DocumentViewer
            source={document.source}
            sourceType={document.sourceType}
            initialValues={initialValues}
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
          title="Docfillyの使い方"
          inactive={isClearConfirmationOpen}
          onClose={() => setOpenDialog(null)}
        >
          <section>
            <h3>Docfillyとは？</h3>
            <p>
              手順書にはしばしば、プロジェクト名や実行環境など、読む人が自分の状況に合わせて読み替える箇所があります。Docfillyでは、それらを書き手があらかじめDocfilly形式に沿って、入力項目や条件分岐としてMarkdown／テキスト文書へ記述します。読み手がその文書を開くと、書き手の設定に基づくフォームが表示されます。自分の環境に合った値を入力することで、置き換え作業ではなく、手順の内容そのものに集中できます。
            </p>
          </section>
          <section>
            <h3>サンプルと詳細仕様</h3>
            <p>組み込みサンプルでフォームと表示内容の変化を試すことができます。</p>
            <button type="button" className="text-button" onClick={openSample}>
              サンプル文書を開く
            </button>
            <a
              href="https://github.com/haiix/Docfilly/blob/main/documents/03-source-format.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              詳細なDocfillyフォーマット仕様
            </a>
          </section>
          <section>
            <h3>文書を開く</h3>
            <p>
              「ファイルを開く」で .md、.markdown、.txt
              を選ぶか、ファイルを画面へドラッグ＆ドロップします。
            </p>
          </section>
          <section>
            <h3>フォームと表示内容</h3>
            <p>
              フォームは、書き手が文書内に定義した入力項目から生成されます。左側のフォームへ値を入力すると、書き手が指定した値の差し込みや条件分岐が処理され、右側に自分向けの本文が表示されます。
            </p>
          </section>
          <section>
            <h3>形式と2種類の保存／書き出し</h3>
            <p>
              Docfilly形式は先頭のHeaderにフォーム設定を持つ文書です。通常のMarkdown／テキストにはフォームがなく、そのまま表示されます。
              「Docfilly形式で保存」は現在のフォーム値を次回の初期値にして、Header、本文テンプレート、条件ディレクティブを保った文書をダウンロードします。通常文書では利用できません。「表示結果を書き出す」はHeaderを除いた現在の本文を保存します。
            </p>
          </section>
          <section>
            <h3>プライバシーと端末内の保存</h3>
            <p>
              開いた文書とフォームへの入力内容はブラウザー内だけで処理され、外部サーバーへ送信されません。最後に開いた1文書のファイル名、元ソース、形式、フォーム値は現在のブラウザープロファイル内へ保存され、次回起動時に復元されます。共有端末では利用後に保存データを削除してください。インストールとオフライン起動には未対応です。
            </p>
            <button
              ref={clearDataButtonRef}
              type="button"
              className="text-button danger-action"
              onClick={openClearConfirmation}
            >
              この端末の保存データを削除
            </button>
          </section>
        </AppDialog>
      )}

      {isClearConfirmationOpen && (
        <AppDialog
          title="この端末の保存データを削除しますか？"
          initialFocusRef={cancelClearButtonRef}
          onClose={closeClearConfirmation}
        >
          <p>
            前回の文書を復元するために保存された、ファイル名、元ソース、形式、フォーム値を削除します。
          </p>
          <p>
            現在表示している文書と元のローカルファイルは削除されません。オフライン起動用のアプリデータも対象外です。
          </p>
          <div className="dialog-actions">
            <button
              ref={cancelClearButtonRef}
              type="button"
              className="toolbar-button dialog-cancel-action"
              onClick={closeClearConfirmation}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="toolbar-button danger-action"
              onClick={() => void clearSavedDocument()}
            >
              保存データを削除
            </button>
          </div>
        </AppDialog>
      )}

      {openDialog === "diagnostics" && diagnostics.length > 0 && (
        <AppDialog
          title={`文書の診断（${diagnostics.length}件）`}
          onClose={() => setOpenDialog(null)}
        >
          <p className="diagnostic-summary">
            文書は表示を継続しています。次の箇所を必要に応じて確認してください。
          </p>
          <ol className="diagnostic-list">
            {diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${diagnostic.line ?? "unknown"}-${index}`}>
                <p>{diagnostic.message}</p>
                <dl>
                  {diagnostic.line !== undefined && (
                    <>
                      <dt>行</dt>
                      <dd>{diagnostic.line}</dd>
                    </>
                  )}
                  {diagnostic.source !== undefined && (
                    <>
                      <dt>ソース</dt>
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
