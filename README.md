# Docfilly

Docfillyは、手順書を読む人が頭の中で行っている「自分の環境への読み替え」を、最初のフォーム入力に変えるためのドキュメントフォーマットと表示ライブラリです。

たとえば、手順書にある`YOUR_PROJECT_NAME`を何度も自分のプロジェクト名へ置き換えながら読む代わりに、読者は最初にプロジェクト名を1回入力します。Docfillyは、その値を反映した読者向けの文書を表示します。これにより、読者は置換作業ではなく、手順の内容そのものに集中できます。

Docfillyには、2種類の利用者がいます。

- **執筆者** — 通常のMarkdown／テキストへ少数の構文を加えて、読者に入力してもらう項目を定義します。テンプレートエンジンやプログラミングの知識は前提にしません。
- **読者** — 構文を理解する必要はありません。フォームへ自分の環境に合った値を入力し、カスタマイズされた文書を読みます。

Docfillyが目指すのは汎用テンプレートエンジンではなく、**人が読むドキュメントを、人ごとに読みやすくする仕組み**です。

## 仕組み

執筆者は、文書の先頭に入力項目を定義し、本文中の読み替えが必要な箇所を`[[設定名]]`で示します。

````text
#!docfilly
プロジェクト名 = MyProject
実行環境 = [development, staging, *production]

---

# [[プロジェクト名]] のセットアップ

次のコマンドを実行してください。

```sh
deploy --project [[プロジェクト名]] --environment [[実行環境]]
```
````

読者には「プロジェクト名」と「実行環境」のフォーム、および入力値が反映された文書が表示されます。Markdownでは、直接表示したときに設定行がSetext形式の見出しとして解釈されないよう、区切り行`---`の前に空行を入れることを推奨します。空行の有無はDocfillyの解析結果に影響しません。先頭に`#!docfilly`がないファイルは、通常のMarkdown／テキストとしてそのまま表示します。

詳細は[Docfillyドキュメント](./documents/README.md)を参照してください。

## 設計原則

1. 読者にDocfillyの構文を要求しない
2. 執筆者が少数の分かりやすい構文だけで書けるようにする
3. 元のMarkdown／テキストを直接開いても、できるだけ読める状態を保つ
4. アプリではなく、文書とその内容を主役にする
5. 読者の頭の中の「読み替え」を、明示的なフォーム入力に変える

記述に問題があっても、Docfillyは読み取れる範囲で文書を表示し、執筆者が修正できるよう注意点を返します。

## リポジトリ構成

- `packages/docfilly`: ViteでビルドするTypeScriptライブラリ
- `packages/react`: `docfilly`をReactへ接続するラッパーライブラリ
- `apps/web`: `docfilly`を利用するVite Webアプリ
- `documents`: 利用方法、フォーマット、APIなどの詳細文書
- [`brand`](./brand/README.md): アイコンの原本、生成設定、Web用アイコンの生成方法

## 開発

```sh
pnpm install
pnpm dev
```

ビルド、静的検査、Vitest、Playwright、CIの詳細は[開発とテスト](./documents/06-development-and-testing.md)を参照してください。Issue、Pull Request、バージョン、デプロイ、リリースの運用は[CONTRIBUTING.md](./CONTRIBUTING.md)を参照してください。

## ライブラリAPI

```ts
import { createDocfilly } from "docfilly";
import "docfilly/styles.css";

const source = `#!docfilly
プロジェクト名 = MyProject

---

# [[プロジェクト名]]
`;

const view = createDocfilly(source, "md", { locale: "ja" });
document.body.append(view.element);

view.form; // 読者が入力するフォーム
view.output; // カスタマイズされた文書の表示要素
view.isDocfilly; // #!docfilly識別子を認識したか
view.outputSource; // 現在の入力値を反映した出力ソース
view.values; // 現在のフォーム値
view.diagnostics; // 読み飛ばしや自動補正に関する執筆者向けの注意点
```

`createDocfilly`の第2引数には`"md"`または`"text"`を指定します。MarkdownのHTML出力はDOMPurifyでサニタイズされます。
標準スタイルは自動注入されず、上記のCSS importを追加した場合だけ適用されます。独自テーマを使う場合はimportを省略し、公開CSSクラスを直接装飾できます。

現在のフォーム値を次回の初期値としてDocfillyソースへ保存する場合は、`updateDocfillyDefaults`を使用します。

```ts
import { updateDocfillyDefaults } from "docfilly";

const updated = updateDocfillyDefaults(source, view.values, { locale: "ja" });

if (updated.isDocfilly) {
  await saveTextFile(updated.source);
}
```

このAPIはHeader内の有効な変数定義だけを更新し、本文、コメント、ラベル、変数順を維持します。通常文書は変更せず、保存できない値は元の初期値を維持して`diagnostics`で通知します。

Webアプリは空状態から`.md`、`.markdown`、`.txt`ファイルを選択するか、ウィンドウ内の任意の位置へドラッグ＆ドロップして読み込めます。組み込みサンプルは空状態またはヘルプの「サンプルを開く」から表示でき、テキスト、ドロップダウン、チェックボックスと本文テンプレートの対応を5分程度で試せます。サンプルはDocfilly形式で保存し、編集して再度開くこともできます。ファイルはブラウザ内で処理され、サーバーには送信されません。

## React API

React 18または19では、`@docfilly/react`を利用できます。

```sh
pnpm add @docfilly/react react react-dom
```

```tsx
import { DocfillyView } from "@docfilly/react";
import "docfilly/styles.css";

<DocfillyView
  source={source}
  sourceType="md"
  options={{
    locale: "ja",
    debounceMs: 200,
    initialValues: new Map([
      ["title", "保存済みのタイトル"],
      ["published", "true"],
    ]),
  }}
  className="document-preview"
  onRender={({ outputSource, values, diagnostics, isDocfilly }) => {
    console.log({ outputSource, values, diagnostics, isDocfilly });
  }}
/>;
```

`DocfillyView`はマウント時にDocfillyを生成し、`source`、`sourceType`、`options.locale`、`options.debounceMs`、または`options.initialValues`の内容が変わると再生成します。アンマウント時には破棄します。`onRender`は初期表示と、その後フォーム入力によって出力が更新されるたびに呼び出されます。コールバックだけを変更した場合や、同じ内容の`initialValues` Mapを渡し直した場合は、フォームの入力状態を維持します。diagnosticsは既定で英語になり、`locale: "ja"`で日本語を指定できます。詳細は[Diagnostic localization](./documents/08-diagnostic-localization.md)を参照してください。

`className`、`id`、`aria-*`などの`HTMLAttributes<HTMLDivElement>`は外側のラッパー要素へ渡されます。`onRender`には現在の`outputSource`、`ReadonlyMap`形式の`values`、`diagnostics`、Docfilly文書かどうかを示す`isDocfilly`が渡されます。

出力や送信の直前に保留中のデバウンス描画を完了する場合は、refの`flush()`を使用します。戻り値は最新の`outputSource`で、ビューがまだ利用できない場合は`null`です。

```tsx
import { useRef } from "react";
import { DocfillyView, type DocfillyViewHandle } from "@docfilly/react";

const viewRef = useRef<DocfillyViewHandle>(null);

<DocfillyView ref={viewRef} source={source} sourceType="md" />;
const latestSource = viewRef.current?.flush();
```

開発時のテスト方法は[開発とテスト](./documents/06-development-and-testing.md)を参照してください。
