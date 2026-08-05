# APIリファレンス

## 公開API一覧

```ts
import {
  createDocfilly,
  parseDocfillySource,
  Docfilly,
  type DocfillyOptions,
  type DocfillyDiagnostic,
  type DocfillyDiagnosticCode,
  type DocfillySourceType,
  type DocfillyVariable,
  type ParsedDocfillySource,
} from "docfilly";
```

## `createDocfilly`

ソースを解析し、フォームと出力を持つ`Docfilly`インスタンスを生成します。

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
const view = createDocfilly(source, "md", { debounceMs: 100 });
document.querySelector("#viewer")?.append(view.element);
```

ソースに読み取れない箇所があっても、構文上の理由で`Error`を送出しません。可能な範囲でインスタンスを生成し、`diagnostics`へ注意点を格納します。

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

構文の確認、独自UIの作成、注意点の表示などに利用できます。`#!docfilly`がない場合は、`isDocfilly`が`false`、`variables`が空、`template`が入力された文書全体になります。

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

変数定義から生成されたフォームです。クラス名は`docfilly__form`です。フォームのsubmitイベントは既定でキャンセルされます。

```ts
const titleInput = view.form.elements.namedItem("title");
```

#### `output: HTMLDivElement`

描画結果の要素です。次のクラスが付きます。

- 共通: `docfilly__output`
- Markdown: `docfilly__output--md`
- テキスト: `docfilly__output--text`

#### `variables: readonly DocfillyVariable[]`

解析済みの変数定義です。フォームの並び順と同じ順序です。

#### `diagnostics: readonly DocfillyDiagnostic[]`

読み飛ばした設定や自動補正した内容です。注意点がなければ空の配列です。注意点が存在しても、フォームと本文は可能な範囲で生成されます。

#### `sourceType: "md" | "text"`

生成時に指定した出力形式です。

### getter

#### `outputSource: string`

現在の値を本文へ置換したソース文字列です。Markdownの場合もHTMLではなくMarkdownソースを返します。

```ts
const markdown = view.outputSource;
```

#### `values: ReadonlyMap<string, string>`

現在のフォーム値を格納した新しいMapを返します。

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
}
```

### `ParsedDocfillySource`

```ts
interface ParsedDocfillySource {
  isDocfilly: boolean;
  variables: readonly DocfillyVariable[];
  template: string;
  diagnostics: readonly DocfillyDiagnostic[];
}
```

### `DocfillyDiagnostic`

```ts
type DocfillyDiagnosticCode =
  | "missing-delimiter"
  | "missing-equals"
  | "invalid-variable-name"
  | "duplicate-variable"
  | "invalid-dropdown"
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
- `.docfilly__field`
- `.docfilly__field--text`
- `.docfilly__field--select`
- `.docfilly__field--checkbox`
- `.docfilly__output`
- `.docfilly__output--md`
- `.docfilly__output--text`
- `.docfilly__output--fallback`

Webデモの[`apps/web/src/style.css`](../apps/web/src/style.css)を実装例として参照できます。
