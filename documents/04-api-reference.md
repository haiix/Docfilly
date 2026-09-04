# APIリファレンス

このAPIは、執筆者が作ったDocfilly文書から、読者向けの入力フォームとカスタマイズされた本文を表示するための組み込み用APIです。読者にDocfilly構文を操作させず、フォーム入力後の文書へ集中できるUIを構築することを前提にしています。

## 公開API一覧

```ts
import {
  createDocfilly,
  parseDocfillySource,
  updateDocfillyDefaults,
  Docfilly,
  type DocfillyInitialValues,
  type DocfillyLocaleOptions,
  type DocfillyOptions,
  type DocfillyDiagnostic,
  type DocfillyDiagnosticCode,
  type DocfillySourceType,
  type DocfillySourceUpdateResult,
  type DocfillyVariable,
  type ParsedDocfillySource,
  type SupportedLocale,
} from "docfilly";
```

## `createDocfilly`

ソースを解析し、読者向けフォームとカスタマイズされた出力を持つ`Docfilly`インスタンスを生成します。

```ts
function createDocfilly(
  source: string,
  sourceType: "md" | "text",
  options?: DocfillyOptions,
): Docfilly;
```

### 引数

- `source`: `#!docfilly`識別子、設定項目、区切り行、本文を含む文字列。識別子がなければ通常文書として扱います
- `sourceType`: `"md"`ならMarkdown、`"text"`ならプレーンテキスト
- `options`: 任意の動作設定

### 例

```ts
const savedValues = new Map([
  ["title", "保存済みのタイトル"],
  ["published", "true"],
]);
const view = createDocfilly(source, "md", {
  locale: "ja",
  debounceMs: 100,
  initialValues: savedValues,
});
document.querySelector("#viewer")?.append(view.element);
```

`initialValues`を指定すると、ソースを書き換えずに保存済みのフォーム値を初期表示へ適用できます。指定のない変数、文字列ではない値、選択肢にないドロップダウン値、`"true"`または`"false"`ではないチェックボックス値は無視され、Headerの初期値が使われます。変数定義にないキーも無視されます。

ソースに読み取れない箇所があっても、構文上の理由で`Error`を送出しません。可能な範囲で読者向けの文書を表示し、`diagnostics`へ執筆者向けの注意点を格納します。

```ts
const view = createDocfilly(source, "md");

if (view.diagnostics.length > 0) {
  showNotice(view.diagnostics.map((item) => item.message));
}

container.append(view.element);
```

## `parseDocfillySource`

DOMを生成せず、変数定義と本文だけを解析します。

```ts
function parseDocfillySource(source: string, options?: DocfillyLocaleOptions): ParsedDocfillySource;
```

```ts
const parsed = parseDocfillySource(source);

console.log(parsed.variables);
console.log(parsed.template);
console.log(parsed.diagnostics);
```

執筆時の構文確認、独自UIの作成、執筆者向け注意点の表示などに利用できます。`#!docfilly`がない場合は、`isDocfilly`が`false`、`variables`が空、`template`が入力された文書全体になります。

識別子があるのに区切り行がない場合は、`isDocfilly`が`true`のまま、識別子より後の内容を`template`として返します。

## `updateDocfillyDefaults`

現在のフォーム値をHeaderの新しい初期値へ反映し、再度フォーム付きで開けるDocfillyソースを生成します。

```ts
function updateDocfillyDefaults(
  source: string,
  values: DocfillyInitialValues,
  options?: DocfillyLocaleOptions,
): DocfillySourceUpdateResult;
```

```ts
const view = createDocfilly(source, "md");
const updated = updateDocfillyDefaults(source, view.values);

if (updated.isDocfilly) {
  downloadAsDocfilly(updated.source);
}

for (const diagnostic of updated.diagnostics) {
  console.warn(diagnostic.message);
}
```

テキスト値は必要に応じてCSV風に引用され、ドロップダウンは選択肢を維持したまま現在値へ選択を移し、チェックボックスは`[x]`または`[ ]`になります。`values`にない変数と変数定義にないキーは無視します。

コメント、ラベル、変数順、本文、LF／CRLF、UTF-8 BOMは維持されます。不正な設定行と重複変数の2行目以降は変更しません。通常文書は`source`を変更せず`isDocfilly: false`で返します。ドロップダウンの選択肢にない値、チェックボックスの`"true"`／`"false"`以外の値、改行を含むテキスト値は保存せず、元の初期値と`invalid-default-value`の注意点を返します。

## `Docfilly`クラス

`new Docfilly(source, sourceType, options)`でも生成できますが、通常は`createDocfilly`の利用を推奨します。

### 読み取り専用プロパティ

#### `isDocfilly: boolean`

ソース先頭に`#!docfilly`識別子があり、Docfilly形式として認識されたかを示します。通常文書では`false`です。

#### `element: HTMLDivElement`

`form`と`output`を含むルート要素です。クラス名は`docfilly`です。

```ts
container.append(view.element);
```

#### `form: HTMLFormElement`

入力項目と説明文から生成された読者向けフォームです。クラス名は`docfilly__form`です。フォームのsubmitイベントは既定でキャンセルされます。入力項目エリアの`>`行は、ソース順に`p.docfilly__description`として挿入され、説明文だけの場合もフォームは表示されます。

```ts
const titleInput = view.form.elements.namedItem("title");
```

#### `output: HTMLDivElement`

描画結果の要素です。次のクラスが付きます。

- 共通: `docfilly__output`
- Markdown: `docfilly__output--md`
- テキスト: `docfilly__output--text`

#### `variables: readonly DocfillyVariable[]`

解析済みの変数定義です。変数同士の並び順はフォームと同じです。フォーム内の説明文は入力値を持たないため、この配列には含まれません。

#### `diagnostics: readonly DocfillyDiagnostic[]`

読み飛ばした設定や自動補正した内容です。執筆者へ修正方法を伝えるために利用できます。注意点が存在しても、フォームと本文は可能な範囲で生成されます。

#### `sourceType: "md" | "text"`

生成時に指定した出力形式です。

### getter

#### `outputSource: string`

現在の値を本文へ置換したソース文字列です。Markdownの場合もHTMLではなくMarkdownソースを返します。

```ts
const markdown = view.outputSource;
```

#### `values: ReadonlyMap<string, string>`

現在のフォーム値を格納した新しいMapを返します。フォーム内の説明文は含まれません。

```ts
const environment = view.values.get("environment");
```

チェックボックスの値は文字列の`"true"`または`"false"`です。

### メソッド

#### `render(): string`

現在のフォーム値を読み取り、出力を直ちに再描画します。戻り値は更新後の`outputSource`です。

```ts
const result = view.render();
```

通常のフォーム操作では自動的に呼び出されるため、手動呼び出しはプログラムから値を変更した場合などに使用します。

```ts
const input = view.form.elements.namedItem("title");
if (input instanceof HTMLInputElement) {
  input.value = "New title";
  view.render();
}
```

#### `flush(): string`

フォーム操作によるデバウンス描画が保留中の場合、その描画を直ちに完了します。保留中の描画がなければ再描画せず、現在の`outputSource`を返します。出力や送信など、操作時点のフォーム値が必要な処理の直前に使用します。

```ts
const latestSource = view.flush();
```

#### `destroy(): void`

保留中の再描画を停止し、イベントリスナーを解除して、ルート要素をDOMから削除します。

## イベント

### `docfilly:render`

描画完了後、`element`から`CustomEvent`が発火します。イベントは既定ではバブリングしません。

```ts
view.element.addEventListener("docfilly:render", (event) => {
  const detail = (event as CustomEvent<{ outputSource: string }>).detail;
  console.log(detail.outputSource);
});
```

初回描画はコンストラクター内で行われます。初回イベントを監視する前に描画が完了するため、初期値は`outputSource`から取得してください。

## 型定義

### `DocfillySourceType`

```ts
type DocfillySourceType = "md" | "text";
```

### `DocfillyOptions`

```ts
interface DocfillyOptions extends DocfillyLocaleOptions {
  debounceMs?: number;
  initialValues?: ReadonlyMap<string, string>;
}
```

- `locale`: diagnosticの言語タグ。`en`と`ja`に対応し、地域付きタグも正規化します。明示しない場合はブラウザー言語、ブラウザー外では英語を使用します
- `debounceMs`: フォーム操作から再描画までの待機時間。既定値は200ミリ秒です
- `initialValues`: 初期表示へ適用する、変数名とシリアライズ済み値のMapです。`values` getterの戻り値をそのまま次回の生成に渡せます

### `DocfillyLocaleOptions` / `SupportedLocale`

```ts
interface DocfillyLocaleOptions {
  locale?: string;
}

type SupportedLocale = "en" | "ja";
```

解決順序と言語追加手順は[Diagnostic localization](./08-diagnostic-localization.md)を参照してください。

### `DocfillyInitialValues`

```ts
type DocfillyInitialValues = ReadonlyMap<string, string>;
```

テキストとドロップダウンは入力値を文字列で、チェックボックスは`"true"`または`"false"`で指定します。

### `ParsedDocfillySource`

```ts
interface ParsedDocfillySource {
  isDocfilly: boolean;
  variables: readonly DocfillyVariable[];
  template: string;
  templateLineOffset: number;
  diagnostics: readonly DocfillyDiagnostic[];
}
```

`templateLineOffset`は、`template`の1行目より前に元文書内で存在した行数です。テンプレートから生成される診断の行番号を元文書の行番号へ対応させるために利用できます。

### `DocfillySourceUpdateResult`

```ts
interface DocfillySourceUpdateResult {
  source: string;
  isDocfilly: boolean;
  diagnostics: readonly DocfillyDiagnostic[];
}
```

- `source`: 更新後のDocfillyソース。通常文書と安全に更新できない値は元の内容を維持します
- `isDocfilly`: `#!docfilly`識別子を認識したかを示します
- `diagnostics`: 元ソースの解析時と値の保存時に見つかった注意点です

### `DocfillyDiagnostic`

```ts
type DocfillyDiagnosticCode =
  | "missing-delimiter"
  | "missing-equals"
  | "invalid-variable-name"
  | "duplicate-variable"
  | "invalid-dropdown"
  | "invalid-quoting"
  | "invalid-default-value"
  | "undefined-variable"
  | "unknown-filter"
  | "invalid-placeholder"
  | "invalid-if-condition"
  | "undefined-condition-variable"
  | "invalid-condition-type"
  | "unexpected-directive"
  | "duplicate-else"
  | "unclosed-if"
  | "if-nesting-too-deep"
  | "markdown-render-fallback";

interface DocfillyDiagnostic {
  code: DocfillyDiagnosticCode;
  severity: "warning";
  message: string;
  line?: number;
  source?: string;
}
```

- `code`: アプリ側で注意点の種類を判定するための安定した識別子
- `message`: 文書を作る人へ表示できる日本語メッセージ
- `line`: 問題が見つかった行番号。文書全体に関する注意では省略されます
- `source`: 対象となった元の行
- `severity`: 現在は描画を止めない`"warning"`のみ

### `DocfillyVariable`

`type`を判別キーとするunion型です。

```ts
type DocfillyVariable =
  | {
      type: "text";
      name: string;
      label: string;
      initialValue: string;
    }
  | {
      type: "select";
      name: string;
      label: string;
      options: readonly string[];
      initialValue: string;
    }
  | {
      type: "checkbox";
      name: string;
      label: string;
      initialValue: boolean;
    };
```

## CSSクラス

ライブラリは構造を生成しますが、CSSを自動注入しません。フォームと本文のレスポンシブレイアウト、入力欄、Markdown、プレーンテキスト、描画失敗時のフォールバック、ライト／ダーク配色を含む公式CSSは、次のサブパスから任意で読み込めます。Reactでも同じCSSを使用します。

```ts
import "docfilly/styles.css";
```

公式CSSは`.docfilly`以下だけへ適用され、コンテナ幅が47.5rem以上ならフォームと本文を左右に、それ未満なら上下に配置します。配色は`prefers-color-scheme`に従い、`--docfilly-color-scheme`で明示的に切り替えられます。CSSをimportしなければ、従来どおり構造だけが生成されます。

独自CSSでは次の公開クラスを装飾できます。

- `.docfilly`
- `.docfilly--without-form`
- `.docfilly__form`
- `.docfilly__description`
- `.docfilly__field`
- `.docfilly__field--text`
- `.docfilly__field--select`
- `.docfilly__field--checkbox`
- `.docfilly__output`
- `.docfilly__output--md`
- `.docfilly__output--text`
- `.docfilly__output--fallback`

### CSSカスタムプロパティ

公式CSSを部分的に調整する場合は、公式CSSより後に読み込むCSSの`.docfilly`ルールで次の`--docfilly-*`プロパティを上書きします。

| プロパティ                                                        | 用途                                   |
| ----------------------------------------------------------------- | -------------------------------------- |
| `--docfilly-color-scheme`                                         | `light`または`dark`の配色選択          |
| `--docfilly-color`、`--docfilly-background`                       | 本文色と背景色                         |
| `--docfilly-form-background`                                      | フォーム領域の背景色                   |
| `--docfilly-muted-color`、`--docfilly-label-color`                | 説明文とラベルの文字色                 |
| `--docfilly-border-color`、`--docfilly-field-border-color`        | コンテナ、フォーム、表、入力欄の境界色 |
| `--docfilly-accent-color`、`--docfilly-focus-ring-color`          | checkbox、フォーカス枠、アクセント色   |
| `--docfilly-code-background`                                      | インラインコードの背景色               |
| `--docfilly-code-block-color`、`--docfilly-code-block-background` | コードブロックの文字色と背景色         |
| `--docfilly-spacing`                                              | フォームと本文の基準余白               |
| `--docfilly-form-width`                                           | 2カラム時のフォーム列幅                |
| `--docfilly-sticky-top`                                           | 追従フォームの上端位置                 |
| `--docfilly-form-max-height`                                      | 追従フォームの最大高                   |

例えば固定ヘッダーの下へフォームを配置するには、次のように上書きします。

```css
.document-viewer .docfilly {
  --docfilly-accent-color: #0f766e;
  --docfilly-sticky-top: 5rem;
  --docfilly-form-max-height: calc(100dvh - 6rem);
}
```
