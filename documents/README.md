# Docfilly ドキュメント

Docfillyは、手順書にある「この値は自分の環境に合わせて読み替えてください」という作業を、読者の頭の中からフォームへ移します。読者が必要な値を最初に入力すると、その人向けにカスタマイズされたMarkdown／プレーンテキストが表示されます。

執筆者は、通常の文書へ最小限の入力項目と`[[設定名]]`を加えるだけです。読者はこの構文を覚える必要がなく、フォームとカスタマイズ後の文書だけを使います。

## 立場別の読み方

- **まず考え方を知りたい方** — [概要](./01-overview.md)
- **文書を作る執筆者** — [はじめに](./02-getting-started.md)、[ソースフォーマット仕様](./03-source-format.md)
- **Docfillyを組み込む開発者** — [APIリファレンス](./04-api-reference.md)、[セキュリティと制約](./07-security-and-limitations.md)、[Diagnostic localization](./08-diagnostic-localization.md)
- **このリポジトリを開発する方** — [Webデモ](./05-web-demo.md)、[開発とテスト](./06-development-and-testing.md)

## ドキュメント一覧

1. [概要](./01-overview.md) — 解決する問題、執筆者と読者、設計原則
2. [はじめに](./02-getting-started.md) — 最初のDocfilly文書とライブラリへの組み込み
3. [ソースフォーマット仕様](./03-source-format.md) — 入力項目、参照記法、記述ミスからの復旧
4. [APIリファレンス](./04-api-reference.md) — 関数、クラス、型、イベント
5. [Webデモ](./05-web-demo.md) — 読者向けビューアーの仕様と実装
6. [開発とテスト](./06-development-and-testing.md) — コマンド、ビルド、Vitest
7. [セキュリティと制約](./07-security-and-limitations.md) — サニタイズ、対応環境、既知の制約
8. [Diagnostic localization](./08-diagnostic-localization.md) — locale API, resolution order, and adding a language

## まず試す

```sh
pnpm install
pnpm dev
```

開発サーバーのURLをブラウザで開き、空状態から`.md`、`.markdown`、または`.txt`ファイルを選択します。ローカルファイルがない場合は「サンプルを開く」を選ぶと、5分程度の組み込みチュートリアルでテキスト、ドロップダウン、チェックボックスと本文の対応を確認できます。チュートリアルからDocfilly形式のソースを保存し、編集して再度開くこともできます。

Docfilly文書を書き始める場合は、[はじめに](./02-getting-started.md)へ進んでください。
