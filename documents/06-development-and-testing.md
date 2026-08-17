# 開発とテスト

変更時は技術的な正しさに加え、Docfillyの中心的な体験である「読者の読み替えを最初のフォーム入力へ移すこと」を維持してください。構文やUIを追加する場合も、読者に構文理解を要求せず、文書を主役にできるかを判断基準にします。

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
- Webアプリ設定: `apps/web/vitest.config.ts`
- Webアプリテスト: `apps/web/tests/`

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
- ラベル、テキスト値、ドロップダウン選択肢のCSV風引用
- 引用された型記法をテキストとして扱うこと
- 不正な引用の読み飛ばしと診断
- ifブロックの構文木生成、ネスト、不正構文からの原文復旧

### DOM統合

- フォーム要素の生成
- Markdownの初期描画
- 現在値の取得
- 入力イベント後の遅延描画
- 未定義プレースホルダーの維持
- 6種類の文字列ケース変換とフィルター合成
- 未知のフィルターと不正なプレースホルダーの診断
- 設定項目がない文書でのフォーム非表示
- 変数値のHTMLエスケープ
- 引用された変数値のHTMLエスケープ
- Markdown HTMLのサニタイズ
- `docfilly:render`イベント
- `destroy()`によるDOM削除
- チェックボックス条件と`#else`の再描画
- テキスト／ドロップダウンの`=`／`!=`比較とCSV風引用
- ifブロックのネスト、32階層の上限、エスケープ
- 不正なifブロックの原文保持と行番号付き診断
- 入力値をディレクティブとして再解釈しないこと

### Webアプリ

- `.md`、`.markdown`、`.txt`のファイル形式判定
- 対応外のファイル形式の拒否
- ドラッグ中のドロップ領域表示
- 1ファイルのドロップ受付と複数ファイルの拒否

## 変更時の確認手順

```sh
pnpm lint
pnpm format:check
pnpm test
pnpm typecheck
pnpm build
```

フォーマット仕様や公開APIを変更した場合は、テストと合わせて`documents/`内の該当ドキュメントも更新してください。

文書またはUIの変更では、次の点も確認します。

- 読者がDocfillyの内部構文を知らなくても操作できる
- 同じ値を何度も読み替えず、最初の入力だけで本文全体へ反映できる
- 執筆者が通常のMarkdown／テキストへ少数の構文を加えるだけで済む
- Docfillyを通さずにソースを開いても、本文をできるだけ理解できる
- 注意点は読者の閲覧を止めず、執筆者が修正に使える

## CI

GitHub Actionsの`.github/workflows/ci.yml`は、`main`へのpush、すべてのPull Request、手動実行で起動します。

CIではNode.js 24と`package.json`で固定したpnpmを使用し、次の処理を順番に実行します。

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm format:check`
4. `pnpm test`
5. `pnpm typecheck`
6. `pnpm build`

同じブランチで新しい実行が開始された場合、古い実行はキャンセルされます。

## テスト追加の方針

- 構文解析だけで確認できる内容は`parseDocfillySource`を直接テストする
- フォームや描画に関係する内容は`createDocfilly`を使ってjsdom上でテストする
- タイマーを含む処理は`vi.useFakeTimers()`を使う
- セキュリティ修正には回帰テストを追加する
