import { useCallback, useRef, useState } from "react";
import type { DocfillyDiagnostic } from "docfilly";
import { AppDialog } from "./AppDialog";
import {
  readDocumentFile,
  UnsupportedDocumentFileError,
  type LoadedDocument,
} from "./document-file";
import { createDocumentExport, downloadDocumentExport } from "./document-export";
import { DocumentViewer, type ViewerStatus } from "./DocumentViewer";
import { FileDropZone } from "./FileDropZone";

const sampleSource = `#!docfilly
# Docfilly sample
project_name | プロジェクト名 = Docfilly
environment | 実行環境 = [development, *staging, production]
author | 作成者 = 山田太郎
use_docker | Dockerを使用する = [x]
---
# [[project_name]] セットアップ

作成者: **[[author]]**

- 実行環境: \`[[environment]]\`
- Docker: \`[[use_docker]]\`
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

export function App() {
  const [document, setDocument] = useState<LoadedDocument | null>(null);
  const [outputSource, setOutputSource] = useState<string | null>(null);
  const [status, setStatus] = useState<ViewerStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<readonly DocfillyDiagnostic[]>([]);
  const [openDialog, setOpenDialog] = useState<"help" | "diagnostics" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showDocument = useCallback((nextDocument: LoadedDocument): void => {
    setStatus(loadingStatus);
    setOutputSource(null);
    setDiagnostics([]);
    setDocument(nextDocument);
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
            disabled={outputSource === null}
            onClick={exportRenderedDocument}
          >
            表示結果を書き出す
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
          <details className="toolbar-overflow">
            <summary className="toolbar-button">その他</summary>
            <div className="toolbar-overflow__menu">
              <button
                type="button"
                disabled={outputSource === null}
                onClick={exportRenderedDocument}
              >
                表示結果を書き出す
              </button>
              {diagnostics.length > 0 && (
                <button type="button" onClick={() => setOpenDialog("diagnostics")}>
                  診断 {diagnostics.length}件
                </button>
              )}
              <button type="button" onClick={() => setOpenDialog("help")}>
                ヘルプ
              </button>
            </div>
          </details>
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
            onStatusChange={setStatus}
            onOutputSourceChange={setOutputSource}
            onDiagnosticsChange={setDiagnostics}
          />
        )}
      </main>

      {openDialog === "help" && (
        <AppDialog title="Docfillyの使い方" onClose={() => setOpenDialog(null)}>
          <section>
            <h3>文書を開く</h3>
            <p>
              「ファイルを開く」で .md、.markdown、.txt
              を選ぶか、ファイルを画面へドラッグ＆ドロップします。
              Docfilly文書では、フォームへの入力が右側の本文へ反映されます。
            </p>
            <button type="button" className="text-button" onClick={openSample}>
              サンプル文書を開く
            </button>
          </section>
          <section>
            <h3>形式と書き出し</h3>
            <p>
              Docfilly形式は先頭のHeaderにフォーム設定を持つ文書です。通常のMarkdown／テキストにはフォームがありません。
              「表示結果を書き出す」はHeaderを除いた現在の本文を保存します。フォーム付きで再度開けるDocfilly形式での保存は、現在のWebビューアーでは未対応です。
            </p>
            <a href="https://github.com/haiix/Docfilly/blob/main/documents/03-source-format.md">
              詳細なDocfillyフォーマット仕様
            </a>
          </section>
          <section>
            <h3>プライバシーと利用範囲</h3>
            <p>
              開いたファイルは外部サーバーへ送信されず、ブラウザー内だけで処理されます。現在は文書を端末内へ保存せず、再読み込み時の復元、保存データの削除、インストール、オフライン起動には未対応です。
            </p>
          </section>
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
