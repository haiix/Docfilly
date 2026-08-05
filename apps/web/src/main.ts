import { createDocfilly, type Docfilly, type DocfillySourceType } from "docfilly";
import "./style.css";

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

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("App root element was not found");

app.innerHTML = `
  <header class="site-header">
    <div>
      <p class="eyebrow">Variable document viewer</p>
      <h1>Docfilly</h1>
      <p class="lead">Markdown またはテキストファイルを読み込み、フォームから内容を変更できます。</p>
    </div>
    <label class="file-picker">
      <span>ファイルを選択</span>
      <input id="file-input" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" />
    </label>
  </header>
  <main>
    <div class="document-meta">
      <div>
        <span class="meta-label">表示中のファイル</span>
        <strong id="file-name">サンプル.md</strong>
      </div>
      <p id="status" role="status">サンプルドキュメントを表示しています。</p>
    </div>
    <div id="viewer"></div>
  </main>
`;

function getRequiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required UI element was not found: ${selector}`);
  return element;
}

const fileInput = getRequiredElement<HTMLInputElement>("#file-input");
const viewer = getRequiredElement<HTMLDivElement>("#viewer");
const fileName = getRequiredElement<HTMLElement>("#file-name");
const status = getRequiredElement<HTMLElement>("#status");

let documentView: Docfilly | undefined;

function showDocument(source: string, sourceType: DocfillySourceType, name: string): void {
  const nextView = createDocfilly(source, sourceType);
  documentView?.destroy();
  documentView = nextView;
  viewer.replaceChildren(nextView.element);
  fileName.textContent = name;
  const warningCount = nextView.diagnostics.length;
  status.classList.toggle("is-warning", warningCount > 0);
  if (!nextView.isDocfilly) {
    const formatName = sourceType === "md" ? "Markdown" : "テキスト";
    status.textContent = `#!docfilly識別子がないため、通常の${formatName}として表示しています。`;
    status.removeAttribute("title");
  } else if (warningCount > 0) {
    status.textContent = `${nextView.variables.length}個の設定項目を読み込みました。${warningCount}件の注意点があります：${nextView.diagnostics[0].message}`;
    status.title = nextView.diagnostics.map((item) => item.message).join("\n");
  } else {
    status.textContent = `${nextView.variables.length}個の設定項目を読み込みました。`;
    status.removeAttribute("title");
  }
}

function detectSourceType(file: File): DocfillySourceType {
  const extension = file.name.toLowerCase().split(".").pop();
  return extension === "md" || extension === "markdown" ? "md" : "text";
}

async function handleFileChange(): Promise<void> {
  const file = fileInput.files?.[0];
  if (!file) return;

  try {
    const source = await file.text();
    showDocument(source, detectSourceType(file), file.name);
  } catch {
    status.textContent = "ファイルを読み込めませんでした。もう一度選択してください。";
    status.classList.add("is-warning");
  } finally {
    fileInput.value = "";
  }
}

fileInput.addEventListener("change", () => {
  void handleFileChange();
});

showDocument(sampleSource, "md", "サンプル.md");
