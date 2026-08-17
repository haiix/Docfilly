# はじめに

このページでは、執筆者が最初のDocfilly文書を作り、読者向けの表示を確認するまでを説明します。ライブラリを別のアプリへ組み込む方法も後半で扱います。

## 最初の文書を作る

次の内容を`setup.md`として保存します。

````text
#!docfilly
プロジェクト名 = MyProject
実行環境 = [development, staging, *production]
公開する = [x]
---
# [[プロジェクト名]] のセットアップ

対象は **[[実行環境]]** 環境です。

```sh
deploy --project [[プロジェクト名]] --environment [[実行環境]]
```
````

この文書では、区切り行`---`より前が入力項目、後ろが読者に表示する本文です。読者が「プロジェクト名」と「実行環境」をフォームで指定すると、見出し、説明、コマンドのすべてに同じ値が反映されます。

執筆者は同じ値を使う箇所へ`[[設定名]]`を書く必要がありますが、読者はこの構文を扱いません。詳しい記法は[ソースフォーマット仕様](./03-source-format.md)を参照してください。

チェックボックスやドロップダウンに応じて手順そのものを切り替える場合は、ifブロックを使用できます。

```text
[[#if 公開する]]
公開時だけ必要な手順です。
[[#endif]]

[[#if 実行環境 = production]]
本番環境向けの注意事項です。
[[#endif]]
```

## Webデモで確認する

### 必要な環境

- Node.js
- pnpm 11系（リポジトリでは`pnpm@11.9.0`を指定）
- DOM APIを利用できるブラウザ

リポジトリのルートで実行します。

```sh
pnpm install
pnpm dev
```

`pnpm dev`は`apps/web`のVite開発サーバーを起動します。ブラウザで開発サーバーを開き、作成した`setup.md`を選択またはドラッグ＆ドロップしてください。

フォームの値を変更すると、カスタマイズされた本文が更新されます。これが読者の基本体験です。

先頭に`#!docfilly`がない通常のMarkdown／テキストも読み込めます。その場合はフォームを生成せず、文書全体をそのまま表示します。

## ライブラリを組み込む

Webデモでは、次のworkspace依存として登録されています。

```json
{
  "dependencies": {
    "docfilly": "workspace:*"
  }
}
```

Docfillyがnpmなどへ公開された後は、利用側プロジェクトへ通常のパッケージとして追加できます。現在のリポジトリ内ではworkspace依存を使用してください。

文書のソースを`createDocfilly`へ渡し、返された要素をページへ追加します。

```ts
import { createDocfilly } from "docfilly";

const view = createDocfilly(source, "md");
document.body.append(view.element);
```

`view.element`には、読者が入力するフォームと、カスタマイズされた文書の表示領域が含まれます。構文上の注意点を執筆者へ知らせる場合は`view.diagnostics`を利用できます。

## プレーンテキストを表示する

第2引数へ`"text"`を指定します。

```ts
const view = createDocfilly("#!docfilly\n名前 = Alice\n---\nこんにちは、[[名前]]さん。", "text");

document.body.append(view.element);
```

テキスト出力ではHTMLを使用せず、`textContent`へ結果を設定します。改行を表示するには、出力要素へ`white-space: pre-wrap`を指定してください。

```css
.docfilly__output--text {
  white-space: pre-wrap;
}
```

## 再描画の待ち時間を変更する

入力イベントから描画までの待ち時間は、既定で200ミリ秒です。

```ts
const view = createDocfilly(source, "md", {
  debounceMs: 50,
});
```

プログラムから入力値を変更し、すぐに本文へ反映したい場合は`view.render()`を呼び出せます。

## 後片付け

画面遷移などで利用を終了するときは`destroy()`を呼び出します。

```ts
view.destroy();
```

保留中のタイマーとイベントリスナーが解除され、`view.element`もDOMから削除されます。
