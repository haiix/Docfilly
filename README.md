# Docfilly

Docfillyは、非エンジニアでも扱えるシンプルな可変ドキュメントフォーマットと、その表示ライブラリです。

プログラミング用の高機能なテンプレートエンジンではなく、通常のMarkdown／テキストへ少数の設定項目を加えるだけで使えることを重視しています。記述に問題があっても可能な範囲で文書を表示し、修正できるよう注意点を返します。

使い方、ソースフォーマット、API仕様などの詳細は、[Docfillyドキュメント](./documents/README.md)を参照してください。

Docfilly形式を利用する文書は、先頭行に`#!docfilly`を記述します。識別子がないファイルは通常のMarkdown／テキストとして表示されます。

## 構成

- `packages/docfilly`: Vite でビルドする TypeScript ライブラリ
- `apps/web`: `docfilly` を利用する Vite Web アプリ

## コマンド

```sh
pnpm install
pnpm dev
pnpm build
pnpm typecheck
pnpm test
```

## ライブラリAPI

```ts
import { createDocfilly } from "docfilly";

const source = `#!docfilly
title | タイトル = Docfilly
theme | テーマ = [light, *dark]
published | 公開する = [x]
---
# [[title]]

Theme: [[theme]] / Published: [[published]]
`;

const view = createDocfilly(source, "md");
document.body.append(view.element);

view.form;         // 生成されたフォーム
view.output;       // Markdownまたはテキストの表示要素
view.isDocfilly;   // #!docfilly識別子を認識したか
view.outputSource; // 現在の値を反映した出力ソース
view.values;       // 現在のフォーム値
view.diagnostics;  // 読み飛ばしや自動補正に関する注意点
```

`createDocfilly` の第2引数には `"md"` または `"text"` を指定します。MarkdownのHTML出力はDOMPurifyでサニタイズされます。

Webデモでは `.md`、`.markdown`、`.txt` ファイルをローカルから選択できます。ファイルはブラウザ内で読み込まれ、サーバーには送信されません。

## テスト

Vitestとjsdomを使用しています。通常実行は `pnpm test`、ウォッチモードは `pnpm test:watch` です。
