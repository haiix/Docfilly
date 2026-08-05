# はじめに

## 必要な環境

- Node.js
- pnpm 11系（リポジトリでは`pnpm@11.9.0`を指定）
- DOM APIを利用できるブラウザ

## モノレポを起動する

リポジトリのルートで実行します。

```sh
pnpm install
pnpm dev
```

`pnpm dev`は`apps/web`のVite開発サーバーを起動します。

Docfilly専用の設定を使わず、通常のMarkdownやテキストをそのまま読み込むこともできます。先頭に`#!docfilly`がない文書は、フォームなしで文書全体を表示します。

## ライブラリをワークスペースから利用する

Webデモでは、次のworkspace依存として登録されています。

```json
{
  "dependencies": {
    "docfilly": "workspace:*"
  }
}
```

Docfillyがnpmなどへ公開された後は、利用側プロジェクトへ通常のパッケージとして追加できます。現在のリポジトリ内ではworkspace依存を使用してください。

## 最小構成

```ts
import { createDocfilly } from "docfilly";

const source = `#!docfilly
title | タイトル = Docfilly
theme | テーマ = [light, *dark]
published | 公開する = [x]
---
# [[title]]

- Theme: [[theme]]
- Published: [[published]]
`;

const view = createDocfilly(source, "md");
document.body.append(view.element);
```

これだけで、3つの入力欄とMarkdownプレビューを含むコンテナが生成されます。

## プレーンテキストを表示する

第2引数へ`"text"`を指定します。

```ts
const view = createDocfilly(
  "#!docfilly\nname = Alice\n---\nHello, [[name]]!",
  "text",
);

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

即座に現在値を反映したい場合は、`view.render()`を呼び出せます。

## 後片付け

画面遷移などで利用を終了するときは`destroy()`を呼び出します。

```ts
view.destroy();
```

保留中のタイマーとイベントリスナーが解除され、`view.element`もDOMから削除されます。
