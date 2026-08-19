# APIリファレンス

このAPIは、執筆者が作ったDocfilly文書から、読者向けの入力フォームとカスタマイズされた本文を表示するための組み込み用APIです。読者にDocfilly構文を操作させず、フォーム入力後の文書へ集中できるUIを構築することを前提にしています。

## 公開API一覧

```ts
import {
  createDocfilly,
  parseDocfillySource,
  Docfilly,
  type DocfillyInitialValues,
  type DocfillyOptions,
  type DocfillyDiagnostic,
  type DocfillyDiagnosticCode,
  type DocfillySourceType,
  type DocfillyVariable,
  type ParsedDocfillySource,
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
function parseDocfillySource(source: string): ParsedDocfillySource;
```

```ts
const parsed = parseDocfillySource(source);

console.log(parsed.variables);
console.log(parsed.template);
console.log(parsed.diagnostics);
```

執筆時の構文確認、独自UIの作成、執筆者向け注意点の表示などに利用できます。`#!docfilly`がない場合は、`isDocfilly`が`false`、`variables`が空、`template`が入力された文書全体になります。

識別子があるのに区切り行がない場合は、`isDocfilly`が`true`のまま、識別子より後の内容を`template`として返します。

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
interface DocfillyOptions {
  debounceMs?: number;
  initialValues?: ReadonlyMap<string, string>;
}
```

- `debounceMs`: フォーム操作から再描画までの待機時間。既定値は200ミリ秒です
- `initialValues`: 初期表示へ適用する、変数名とシリアライズ済み値のMapです。`values` getterの戻り値をそのまま次回の生成に渡せます

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

### `DocfillyDiagnostic`

```ts
type DocfillyDiagnosticCode =
  | "missing-delimiter"
  | "missing-equals"
  | "invalid-variable-name"
  | "duplicate-variable"
  | "invalid-dropdown"
  | "invalid-quoting"
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

ライブラリは構造を生成しますが、完成したテーマCSSは注入しません。利用側で次のクラスを装飾できます。

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

Webデモの[`apps/web/src/style.css`](../apps/web/src/style.css)を実装例として参照できます。
