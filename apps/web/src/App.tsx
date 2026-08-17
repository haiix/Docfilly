import { useCallback, useState } from "react";
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
  const [document, setDocument] = useState(sampleDocument);
  const [status, setStatus] = useState<ViewerStatus>(loadingStatus);

  const loadFile = useCallback(async (file: File): Promise<void> => {
    try {
      const nextDocument = await readDocumentFile(file);
      setStatus(loadingStatus);
      setDocument(nextDocument);
    } catch (error) {
      setStatus({
        message:
          error instanceof UnsupportedDocumentFileError
            ? error.message
            : "ファイルを読み込めませんでした。もう一度選択してください。",
        isWarning: true,
      });
    }
  }, []);

  const handleValidationError = useCallback((message: string): void => {
    setStatus({ message, isWarning: true });
  }, []);

  return (
    <>
      <header className="site-header">
        <div>
          <p className="eyebrow">Variable document viewer</p>
          <h1>Docfilly</h1>
          <p className="lead">
            Markdown またはテキストファイルを読み込み、フォームから内容を変更できます。
          </p>
        </div>
        <FileDropZone onFile={loadFile} onValidationError={handleValidationError} />
      </header>
      <main>
        <div className="document-meta">
          <div>
            <span className="meta-label">表示中のファイル</span>
            <strong>{document.name}</strong>
          </div>
          <p
            className={status.isWarning ? "is-warning" : undefined}
            role="status"
            title={status.title}
          >
            {status.message}
          </p>
        </div>
        <DocumentViewer
          source={document.source}
          sourceType={document.sourceType}
          onStatusChange={setStatus}
        />
      </main>
    </>
  );
}
