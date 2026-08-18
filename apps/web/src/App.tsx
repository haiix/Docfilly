import { useCallback, useRef, useState } from "react";
import {
  readDocumentFile,
  UnsupportedDocumentFileError,
  type LoadedDocument,
} from "./document-file";
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
  const [status, setStatus] = useState<ViewerStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showDocument = useCallback((nextDocument: LoadedDocument): void => {
    setStatus(loadingStatus);
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
          <button type="button" className="toolbar-button secondary-action" disabled>
            書き出し
          </button>
          <button type="button" className="toolbar-button secondary-action" disabled>
            診断
          </button>
          <button type="button" className="toolbar-button secondary-action" disabled>
            ヘルプ
          </button>
          <details className="toolbar-overflow">
            <summary className="toolbar-button">その他</summary>
            <div className="toolbar-overflow__menu">
              <button type="button" disabled>
                書き出し
              </button>
              <button type="button" disabled>
                診断
              </button>
              <button type="button" disabled>
                ヘルプ
              </button>
            </div>
          </details>
        </nav>
      </header>

      {status !== null && (
        <div
          className={`app-status${status.isWarning ? " is-warning" : ""}`}
          role="status"
          title={status.title}
        >
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
          />
        )}
      </main>
    </div>
  );
}
