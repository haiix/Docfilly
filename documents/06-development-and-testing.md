# 開発とテスト

## ルートコマンド

すべてリポジトリのルートで実行します。

```sh
pnpm install
```

workspace全体の依存関係をインストールします。

```sh
pnpm dev
```

WebデモのVite開発サーバーを起動します。

```sh
pnpm build
```

ライブラリとWebデモをビルドします。

```sh
pnpm typecheck
```

全workspaceのTypeScript型チェックを実行します。

```sh
pnpm lint
```

ESLintでJavaScript／TypeScriptの問題を検査します。自動修正可能な問題には`pnpm lint:fix`を使用できます。

```sh
pnpm format
```

Prettierで対応ファイルを整形します。変更せずに整形状態だけを確認する場合は`pnpm format:check`を使用します。

```sh
pnpm test
```

ライブラリのVitestテストを1回実行します。

```sh
pnpm test:watch
```

Vitestをウォッチモードで起動します。

## ライブラリのビルド

`packages/docfilly`では次の順序でビルドします。

1. ViteでES ModulesとCommonJSを生成
2. TypeScriptで型定義ファイルを生成

出力先は`packages/docfilly/dist`です。

```text
dist/
├─ docfilly.js
├─ docfilly.cjs
└─ index.d.ts
```

## テスト環境

- テストランナー: Vitest
- DOM実装: jsdom
- 設定: `packages/docfilly/vitest.config.ts`
- 解析テスト: `packages/docfilly/tests/parser.test.ts`
- DOM表示テスト: `packages/docfilly/tests/docfilly.test.ts`

jsdomを使うことで、ブラウザを起動せずにフォーム要素、イベント、Markdown出力を検証しています。

## 現在のテスト範囲

### パーサー

- テキスト、ドロップダウン、チェックボックス
- ラベルの省略
- CRLF
- UTF-8 BOM
- 大文字`[X]`の扱い
- 日本語の設定名
- `#!docfilly`識別子と大文字・前後空白の許容
- 識別子がない文書を通常文書として扱うこと
- 識別子がなければ`---`を設定区切りとして解釈しないこと
- 空白付き区切り行
- 識別子があるのに区切り行がない場合のフォールバック
- `=`不足行の読み飛ばし
- 使用できない設定名の読み飛ばし
- 設定名重複時の先勝ち
- 空のドロップダウン項目の除外とテキストへのフォールバック

### DOM統合

- フォーム要素の生成
- Markdownの初期描画
- 現在値の取得
- 入力イベント後の遅延描画
- 未定義プレースホルダーの維持
- 設定項目がない文書でのフォーム非表示
- 変数値のHTMLエスケープ
- Markdown HTMLのサニタイズ
- `docfilly:render`イベント
- `destroy()`によるDOM削除

## 変更時の確認手順

```sh
pnpm lint
pnpm format:check
pnpm test
pnpm typecheck
pnpm build
```

フォーマット仕様や公開APIを変更した場合は、テストと合わせて`documents/`内の該当ドキュメントも更新してください。

## テスト追加の方針

- 構文解析だけで確認できる内容は`parseDocfillySource`を直接テストする
- フォームや描画に関係する内容は`createDocfilly`を使ってjsdom上でテストする
- タイマーを含む処理は`vi.useFakeTimers()`を使う
- セキュリティ修正には回帰テストを追加する
