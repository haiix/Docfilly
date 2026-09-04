import type { SupportedLocale } from "docfilly";

export type WebLocale = SupportedLocale;

interface HelpSection {
  heading: string;
  body: string;
}

export interface WebMessages {
  language: string;
  browserLanguage: string;
  english: string;
  japanese: string;
  home: string;
  viewing: string;
  noFileSelected: string;
  documentActions: string;
  open: string;
  openFile: string;
  saveDocfilly: string;
  exportRendered: string;
  closeDocument: string;
  diagnostics: (count: number) => string;
  settings: string;
  help: string;
  moreActions: string;
  loading: string;
  emptyEyebrow: string;
  emptyTitle: string;
  emptyDescription: string;
  openSample: string;
  supportedFiles: string;
  filesStayLocal: string;
  updateAvailable: string;
  updateLater: string;
  reloadForUpdate: string;
  restored: string;
  restoreFailed: string;
  sessionSaveFailed: string;
  resetComplete: string;
  resetFailed: string;
  closed: string;
  closeCleanupFailed: string;
  unsupportedFile: string;
  fileReadFailed: string;
  multipleFiles: string;
  dropArea: string;
  dropFile: string;
  oneFile: string;
  renderedExportStarted: (fileName: string) => string;
  renderedExportFailed: string;
  docfillySaveStarted: (fileName: string) => string;
  docfillySaveFailed: string;
  ordinaryDocument: (format: string) => string;
  textFormat: string;
  loaded: (fields: number) => string;
  loadedWithDiagnostics: (fields: number, diagnostics: number) => string;
  helpTitle: string;
  helpIntroduction: HelpSection;
  helpSample: HelpSection;
  sampleDocument: string;
  formatSpecification: string;
  helpOpen: HelpSection;
  helpForm: HelpSection;
  helpSave: HelpSection;
  helpExport: HelpSection;
  helpPrivacy: HelpSection;
  settingsTitle: string;
  displaySettings: string;
  languageDescription: string;
  dataPrivacySettings: string;
  storedDataDescription: string;
  preferenceSaveFailed: string;
  resetAppData: string;
  resetTitle: string;
  resetDescription: string;
  resetSafety: string;
  cancel: string;
  confirmResetAppData: string;
  diagnosticsTitle: (count: number) => string;
  diagnosticsSummary: string;
  line: string;
  source: string;
  closeDialog: (title: string) => string;
}

const en: WebMessages = {
  language: "Language",
  browserLanguage: "Follow browser settings",
  english: "English",
  japanese: "Japanese",
  home: "Docfilly home",
  viewing: "Viewing",
  noFileSelected: "No file selected",
  documentActions: "Document actions",
  open: "Open",
  openFile: "Open file",
  saveDocfilly: "Save as Docfilly",
  exportRendered: "Export rendered result",
  closeDocument: "Close document",
  diagnostics: (count) => `Diagnostics (${count})`,
  settings: "Settings",
  help: "Help",
  moreActions: "More actions",
  loading: "Loading document.",
  emptyEyebrow: "Local document viewer",
  emptyTitle: "Open a Docfilly document",
  emptyDescription:
    "Open a Markdown or text file in your browser and customize its content with a form.",
  openSample: "Open sample",
  supportedFiles: "Supports .md, .markdown, and .txt.",
  filesStayLocal: "Files are not sent outside your browser.",
  updateAvailable: "A new version of Docfilly is available.",
  updateLater: "Later",
  reloadForUpdate: "Reload to update",
  restored: "Restored your previous document.",
  restoreFailed: "Saved data on this device could not be loaded. You can open a new document.",
  sessionSaveFailed:
    "Document data could not be saved on this device. The open document remains available.",
  resetComplete: "App data was reset. The document was closed.",
  resetFailed: "App data could not be completely reset. The document was closed.",
  closed: "The document was closed. The original local file was not changed.",
  closeCleanupFailed:
    "The document was closed, but its recovery data could not be deleted from this device. It may be restored after reloading.",
  unsupportedFile: "Supported file types are .md, .markdown, and .txt.",
  fileReadFailed: "The file could not be read. Please select it again.",
  multipleFiles: "Drop one file at a time.",
  dropArea: "File drop area",
  dropFile: "Drop a file here",
  oneFile: "one file",
  renderedExportStarted: (fileName) => `Started exporting the rendered result “${fileName}”.`,
  renderedExportFailed: "The rendered result could not be exported. The document remains open.",
  docfillySaveStarted: (fileName) => `Started saving the Docfilly document “${fileName}”.`,
  docfillySaveFailed:
    "The document could not be saved in Docfilly format. The document and form values remain available.",
  ordinaryDocument: (format) =>
    `This file has no #!docfilly identifier, so it is displayed as ordinary ${format}.`,
  textFormat: "text",
  loaded: (fields) => `Loaded ${fields} configuration ${fields === 1 ? "field" : "fields"}.`,
  loadedWithDiagnostics: (fields, diagnostics) =>
    `Loaded ${fields} configuration ${fields === 1 ? "field" : "fields"}. The document has ${diagnostics} ${diagnostics === 1 ? "diagnostic" : "diagnostics"}.`,
  helpTitle: "Using Docfilly",
  helpIntroduction: {
    heading: "What is Docfilly?",
    body: "Instructions often contain details such as project names or environments that readers must adapt to their situation. An author can express those details as form fields and conditions in a Docfilly Markdown or text document. Readers fill in the generated form and can focus on the instructions instead of manually rewriting them.",
  },
  helpSample: {
    heading: "Sample and specification",
    body: "Try the built-in sample to see how form values change the rendered document.",
  },
  sampleDocument: "Open sample document",
  formatSpecification: "Detailed Docfilly format specification",
  helpOpen: {
    heading: "Open a document",
    body: "Choose a .md, .markdown, or .txt file with Open file, or drag and drop it anywhere on the page.",
  },
  helpForm: {
    heading: "Form and rendered content",
    body: "A Docfilly document defines form fields in its header. Changing a value applies the author-defined substitutions and conditions to the rendered content. Ordinary Markdown and text documents have no form and are displayed unchanged.",
  },
  helpSave: {
    heading: "Save as Docfilly",
    body: "Download a Docfilly source document with the current form values stored as defaults while preserving the form definition, template, and conditions. This action is unavailable for ordinary documents.",
  },
  helpExport: {
    heading: "Export rendered result",
    body: "Download only the rendered body with the current form values applied. The form definition and processed conditions are omitted. Ordinary Markdown and text documents are saved unchanged.",
  },
  helpPrivacy: {
    heading: "Privacy and data on this device",
    body: "Open documents and form values are processed only in your browser and are not sent to an external server. The latest document's file name, source, format, and form values are stored in this browser profile for restoration. Close the document after use on a shared device. After opening Docfilly online once, you can install it with your browser and use its viewer features offline.",
  },
  settingsTitle: "Settings",
  displaySettings: "Display",
  languageDescription: "Choose the language used by the Docfilly interface and diagnostics.",
  dataPrivacySettings: "Data and privacy",
  storedDataDescription:
    "This browser profile stores your language setting, the latest document and form values for restoration, and Docfilly's offline startup data. Open documents and form values are not sent to an external server.",
  preferenceSaveFailed:
    "The language changed, but the setting could not be saved in this browser profile.",
  resetAppData: "Reset app data",
  resetTitle: "Reset app data?",
  resetDescription:
    "This returns the language to your browser setting, closes the displayed document, and deletes user settings, saved recovery data, and Docfilly's offline startup data. You will need an internet connection the next time you use Docfilly.",
  resetSafety:
    "The installed app itself will not be uninstalled. Original local files and downloaded files will not be deleted.",
  cancel: "Cancel",
  confirmResetAppData: "Reset app data",
  diagnosticsTitle: (count) => `Document diagnostics (${count})`,
  diagnosticsSummary:
    "The document remains visible. Review the following locations when appropriate.",
  line: "Line",
  source: "Source",
  closeDialog: (title) => `Close ${title}`,
};

const ja: WebMessages = {
  language: "言語",
  browserLanguage: "ブラウザーの設定に従う",
  english: "English",
  japanese: "日本語",
  home: "Docfilly ホーム",
  viewing: "表示中",
  noFileSelected: "ファイル未選択",
  documentActions: "文書操作",
  open: "開く",
  openFile: "ファイルを開く",
  saveDocfilly: "Docfilly形式で保存",
  exportRendered: "表示結果を書き出す",
  closeDocument: "文書を閉じる",
  diagnostics: (count) => `診断 ${count}件`,
  settings: "設定",
  help: "ヘルプ",
  moreActions: "その他の操作",
  loading: "文書を読み込んでいます。",
  emptyEyebrow: "ローカル文書ビューアー",
  emptyTitle: "Docfilly文書を開く",
  emptyDescription:
    "Markdownまたはテキストファイルをブラウザー内で読み込み、フォームから内容を変更できます。",
  openSample: "サンプルを開く",
  supportedFiles: ".md、.markdown、.txt に対応。",
  filesStayLocal: "ファイルは外部へ送信されません。",
  updateAvailable: "新しいバージョンのDocfillyを利用できます。",
  updateLater: "後で",
  reloadForUpdate: "再読み込みして更新",
  restored: "前回の文書を復元しました。",
  restoreFailed: "この端末の保存データを読み込めませんでした。新しい文書を開けます。",
  sessionSaveFailed: "この端末へ文書データを保存できませんでした。表示中の文書は維持されています。",
  resetComplete: "アプリデータをリセットし、文書を閉じました。",
  resetFailed: "アプリデータを完全にはリセットできませんでした。文書は閉じました。",
  closed: "文書を閉じました。元のローカルファイルは変更されていません。",
  closeCleanupFailed:
    "文書を閉じましたが、この端末の復元データを削除できませんでした。再読み込み時に文書が復元される可能性があります。",
  unsupportedFile: "対応しているファイル形式は.md、.markdown、.txtです。",
  fileReadFailed: "ファイルを読み込めませんでした。もう一度選択してください。",
  multipleFiles: "ファイルは1つずつドロップしてください。",
  dropArea: "ファイルのドロップ領域",
  dropFile: "ここにファイルをドロップ",
  oneFile: "1ファイル",
  renderedExportStarted: (fileName) => `表示結果「${fileName}」の書き出しを開始しました。`,
  renderedExportFailed: "表示結果を書き出せませんでした。文書はそのまま表示されています。",
  docfillySaveStarted: (fileName) => `Docfilly文書「${fileName}」の保存を開始しました。`,
  docfillySaveFailed: "Docfilly形式で保存できませんでした。文書とフォーム値は維持されています。",
  ordinaryDocument: (format) => `#!docfilly識別子がないため、通常の${format}として表示しています。`,
  textFormat: "テキスト",
  loaded: (fields) => `${fields}個の設定項目を読み込みました。`,
  loadedWithDiagnostics: (fields, diagnostics) =>
    `${fields}個の設定項目を読み込みました。文書に${diagnostics}件の診断があります。`,
  helpTitle: "Docfillyの使い方",
  helpIntroduction: {
    heading: "Docfillyとは？",
    body: "手順書にはしばしば、プロジェクト名や実行環境など、読む人が自分の状況に合わせて読み替える箇所があります。Docfillyでは、それらを書き手があらかじめDocfilly形式に沿って、入力項目や条件分岐としてMarkdown／テキスト文書へ記述します。読み手がその文書を開くと、書き手の設定に基づくフォームが表示されます。自分の環境に合った値を入力することで、置き換え作業ではなく、手順の内容そのものに集中できます。",
  },
  helpSample: {
    heading: "サンプルと詳細仕様",
    body: "組み込みサンプルでフォームと表示内容の変化を試すことができます。",
  },
  sampleDocument: "サンプル文書を開く",
  formatSpecification: "詳細なDocfillyフォーマット仕様",
  helpOpen: {
    heading: "文書を開く",
    body: "「ファイルを開く」で .md、.markdown、.txt を選ぶか、ファイルを画面へドラッグ＆ドロップします。",
  },
  helpForm: {
    heading: "フォームと表示内容",
    body: "Docfilly形式の文書は、先頭部分にフォーム設定を持ちます。フォームは、書き手が文書内に定義した入力項目をもとに生成されます。左側のフォームに値を入力すると、書き手が指定した値の差し込みや条件分岐が処理され、右側に自分向けの本文が表示されます。通常のMarkdown／テキスト文書にはフォームがなく、内容がそのまま表示されます。",
  },
  helpSave: {
    heading: "Docfilly形式で保存",
    body: "現在のフォーム値を次回開いたときの初期値として、フォーム設定、本文テンプレート、条件分岐を保ったDocfilly形式の文書をダウンロードします。通常のMarkdown／テキスト文書では利用できません。",
  },
  helpExport: {
    heading: "表示結果を書き出す",
    body: "現在のフォーム値を反映した本文だけを保存します。フォーム設定や処理済みの条件分岐は含まれません。通常のMarkdown／テキスト文書は、内容を変更せずに保存します。",
  },
  helpPrivacy: {
    heading: "プライバシーと端末内の保存",
    body: "開いた文書とフォームへの入力内容はブラウザー内だけで処理され、外部サーバーへ送信されません。最後に開いた1文書のファイル名、元ソース、形式、フォーム値は現在のブラウザープロファイル内へ保存され、次回起動時に復元されます。共有端末では利用後に文書を閉じてください。一度オンラインでDocfillyを開くと、ブラウザーからインストールしてビューアー機能をオフラインでも利用できます。",
  },
  settingsTitle: "設定",
  displaySettings: "表示",
  languageDescription: "Docfillyの画面と診断に使用する言語を選択します。",
  dataPrivacySettings: "データとプライバシー",
  storedDataDescription:
    "このブラウザープロファイルには、言語設定、復元用の最後の文書とフォーム値、Docfillyのオフライン起動用データが保存されます。開いた文書とフォーム値は外部サーバーへ送信されません。",
  preferenceSaveFailed:
    "言語は変更されましたが、このブラウザープロファイルへ設定を保存できませんでした。",
  resetAppData: "アプリデータをリセット",
  resetTitle: "アプリデータをリセットしますか？",
  resetDescription:
    "言語をブラウザーの設定へ戻し、表示中の文書を閉じ、ユーザー設定、保存した文書データ、Docfillyのオフライン起動用データを削除します。次回の利用にはインターネット接続が必要です。",
  resetSafety:
    "インストール済みアプリ自体はアンインストールされません。元のローカルファイルとダウンロード済みファイルは削除されません。",
  cancel: "キャンセル",
  confirmResetAppData: "アプリデータをリセット",
  diagnosticsTitle: (count) => `文書の診断（${count}件）`,
  diagnosticsSummary: "文書は表示を継続しています。次の箇所を必要に応じて確認してください。",
  line: "行",
  source: "ソース",
  closeDialog: (title) => `${title}を閉じる`,
};

export const webMessages: Record<WebLocale, WebMessages> = { en, ja };

export function resolveWebLocale(
  languages: readonly string[] = typeof navigator === "undefined"
    ? []
    : (navigator.languages ?? []),
  language: string | undefined = typeof navigator === "undefined" ? undefined : navigator.language,
): WebLocale {
  for (const candidate of [...languages, language]) {
    const normalized = candidate?.trim().toLowerCase().split("-")[0];
    if (normalized === "en" || normalized === "ja") return normalized;
  }
  return "en";
}
