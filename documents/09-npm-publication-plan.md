# npm公開計画

この文書は、`docfilly`と`@docfilly/react`を将来npmへ公開するときの準備事項と手順を定義します。現時点では公開を有効にせず、公開方針が決まった段階でこの計画を見直します。

## 公開開始前の決定事項

1. `docfilly`のパッケージ名がnpmで利用可能であることを確認する。
2. `@docfilly/react`を公開するnpm organizationと管理者を決める。
3. 対応するNode.js、ブラウザー、Reactのバージョン方針を公開APIとして確定する。
4. npm dist-tagの用途を決める。安定版は`latest`、プレリリースは`next`を使用する。
5. 公開権限を持つ担当者と、アカウント喪失時の復旧方法を決める。

## パッケージメタデータの準備

公開前に各パッケージの`package.json`へ、少なくとも次を設定して確認します。

- `description`
- `license`
- `repository`
- `homepage`
- `bugs`
- `keywords`
- `engines`
- `publishConfig.access`

`pnpm pack`で生成物を作り、ソース、テスト、秘密情報、不要な設定ファイルが混入せず、`dist`、README、LICENSEが含まれることを確認します。

## 認証とサプライチェーン

長期トークンをGitHub Secretsへ保存せず、npm Trusted PublishingとGitHub ActionsのOIDCを使用します。公開workflowには次の制約を設けます。

- 各パッケージのTrusted Publisherに、このリポジトリ、公開workflow名、使用するenvironment、許可する`npm publish`操作を登録する
- GitHub Releaseの作成、または保護された手動environment承認を起点にする
- `contents: read`と`id-token: write`だけを基本権限とする
- npm CLI 11.5.1以降を使用し、Trusted Publishingによるprovenanceの自動生成を確認する
- Actionはcommit SHAで固定する
- 公開対象のタグと`version.txt`、各`package.json`のバージョン一致を再検証する

## 公開前検証

公開jobでは既存CIに加えて次を実行します。

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm format:check`
4. `pnpm version:check`
5. `pnpm test`
6. `pnpm typecheck`
7. `pnpm build`
8. `pnpm pack`したtarballを一時プロジェクトへインストールする
9. ESMの`import`、CommonJSの`require`、TypeScript型解決をsmoke testする
10. Reactパッケージから公開済みCoreを解決できることを確認する

## 公開順序

ワークスペース依存を公開用バージョンへ変換できることを確認したうえで、次の順序で公開します。

1. `docfilly`
2. `@docfilly/react`

片方だけ公開された状態を短くするため、同じ承認済みworkflow内で連続実行します。Coreの公開に失敗した場合はReactを公開しません。

## リリース後確認

1. npm上のバージョン、dist-tag、provenanceを確認する。
2. 空の一時プロジェクトでレジストリから両パッケージをインストールする。
3. ESM、CommonJS、Reactの最小利用例を実行する。
4. GitHub ReleaseとCHANGELOGからnpmパッケージへ到達できることを確認する。

公開済みバージョンは削除せず、問題がある場合は`npm deprecate`で影響と代替バージョンを案内し、修正版を新しいバージョンとして公開します。
