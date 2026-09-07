# API reference

The embedding API turns an author-created Docfilly source into a reader-facing form and
customized body. Applications should keep Docfilly syntax away from readers and let them focus
on the document after completing the form.

## Public exports

```ts
import {
  createDocfilly,
  parseDocfillySource,
  resolveLocale,
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

Parses source and creates a `Docfilly` instance containing a reader form and customized output.

```ts
function createDocfilly(
  source: string,
  sourceType: "md" | "text",
  options?: DocfillyOptions,
): Docfilly;
```

### Parameters

- `source`: a source string containing the optional `#!docfilly` marker, field definitions,
  separator, and body. Source without the marker is treated as an ordinary document.
- `sourceType`: `"md"` for Markdown or `"text"` for plain text.
- `options`: optional behavior settings.

### Example

```ts
const savedValues = new Map([
  ["title", "Saved title"],
  ["published", "true"],
]);
const view = createDocfilly(source, "md", {
  locale: "en",
  debounceMs: 100,
  initialValues: savedValues,
});
document.querySelector("#viewer")?.append(view.element);
```

`initialValues` applies saved values to the initial view without rewriting the source.
Docfilly ignores undefined variables, non-string values, dropdown values absent from the option
list, and checkbox values other than `"true"` or `"false"`. In those cases it uses the header
default. Keys with no corresponding definition are also ignored.

Source syntax problems do not cause `createDocfilly` to throw an `Error`. The instance renders
as much reader-facing content as possible and reports author-facing notices in `diagnostics`.

```ts
const view = createDocfilly(source, "md");

if (view.diagnostics.length > 0) {
  showNotice(view.diagnostics.map((item) => item.message));
}

container.append(view.element);
```

## `parseDocfillySource`

Parses variable definitions and body content without creating DOM elements.

```ts
function parseDocfillySource(source: string, options?: DocfillyLocaleOptions): ParsedDocfillySource;
```

```ts
const parsed = parseDocfillySource(source);

console.log(parsed.variables);
console.log(parsed.template);
console.log(parsed.diagnostics);
```

Use it for authoring validation, custom interfaces, or diagnostic presentation. When the marker
is absent, `isDocfilly` is `false`, `variables` is empty, and `template` is the complete
input.

When the marker is present but the separator is missing, `isDocfilly` remains `true` and
`template` contains everything after the marker.

## `updateDocfillyDefaults`

Writes current form values into header defaults, producing source that can be reopened with a
prepopulated Docfilly form.

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

Text values are quoted in CSV style when needed. Dropdown options stay in place while `*`
moves to the current selection. Checkboxes become `[x]` or `[ ]`. Variables absent from
`values`, and keys absent from the definitions, are ignored.

Comments, labels, variable order, body content, LF or CRLF line endings, and a UTF-8 BOM are
preserved. Invalid definitions and duplicate definitions after the first are unchanged. An
ordinary document is returned unchanged with `isDocfilly: false`. A dropdown value outside its
options, a checkbox value other than `"true"` or `"false"`, or a multiline text value is not
saved; the original default remains and an `invalid-default-value` diagnostic is returned.

## `Docfilly` class

`new Docfilly(source, sourceType, options)` is available, but `createDocfilly` is recommended
for ordinary use.

### Read-only properties

#### `isDocfilly: boolean`

Whether the source begins with a recognized `#!docfilly` marker. It is `false` for ordinary
documents.

#### `element: HTMLDivElement`

The root containing `form` and `output`. Its class is `docfilly`.

```ts
container.append(view.element);
```

#### `form: HTMLFormElement`

The reader form generated from fields and instructions. Its class is `docfilly__form`, and its
submit event is prevented by default. Header lines beginning with `>` are inserted in source
order as `p.docfilly__description`. A form is shown even when it contains instructions only.

```ts
const titleInput = view.form.elements.namedItem("title");
```

#### `output: HTMLDivElement`

The rendered output element has these classes:

- Always: `docfilly__output`
- Markdown: `docfilly__output--md`
- Plain text: `docfilly__output--text`

#### `variables: readonly DocfillyVariable[]`

Parsed variable definitions in form order. Instructions have no values and are not included.

#### `diagnostics: readonly DocfillyDiagnostic[]`

Definitions that were skipped and content that was recovered. Applications can use these values
to help authors correct source. The form and body are still generated where possible.

#### `sourceType: "md" | "text"`

The output type selected at construction.

### Getters

#### `outputSource: string`

The body source after substituting current values. For Markdown, this is Markdown source rather
than HTML.

```ts
const markdown = view.outputSource;
```

#### `values: ReadonlyMap<string, string>`

A new Map containing current form values. Instructions are not included.

```ts
const environment = view.values.get("environment");
```

Checkbox values are the strings `"true"` and `"false"`.

### Methods

#### `render(): string`

Reads current form values and renders immediately. Returns the updated `outputSource`.

```ts
const result = view.render();
```

Ordinary form interaction calls this automatically. Call it explicitly after changing a value
programmatically.

```ts
const input = view.form.elements.namedItem("title");
if (input instanceof HTMLInputElement) {
  input.value = "New title";
  view.render();
}
```

#### `flush(): string`

Completes a pending debounced render immediately. If none is pending, it does not rerender and
returns the current `outputSource`. Call it before export or submission when the values at the
exact time of the action are required.

```ts
const latestSource = view.flush();
```

#### `destroy(): void`

Cancels pending rendering, removes event listeners, and removes the root element from the DOM.

## Events

### `docfilly:render`

After each render, `element` dispatches a `CustomEvent`. It does not bubble by default.

```ts
view.element.addEventListener("docfilly:render", (event) => {
  const detail = (event as CustomEvent<{ outputSource: string }>).detail;
  console.log(detail.outputSource);
});
```

The initial render completes inside the constructor, before a listener can be attached. Read
`outputSource` for the initial result.

## Types

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

- `locale`: diagnostic language tag. `en` and `ja` are supported and regional tags are
  normalized. If omitted, the browser language is used; outside a browser, English is used.
- `debounceMs`: delay between form interaction and rendering; defaults to 200 milliseconds.
- `initialValues`: a Map of variable names to serialized values for the initial view. The Map
  returned by the `values` getter can be passed directly to a later instance.

### `DocfillyLocaleOptions` and `SupportedLocale`

```ts
interface DocfillyLocaleOptions {
  locale?: string;
}

type SupportedLocale = "en" | "ja";
```

See [Diagnostic localization](./08-diagnostic-localization.md) for resolution order and language
extension instructions.

### `DocfillyInitialValues`

```ts
type DocfillyInitialValues = ReadonlyMap<string, string>;
```

Text and dropdown values are strings. Checkbox values are `"true"` or `"false"`.

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

`templateLineOffset` is the number of original source lines preceding the first line of
`template`. It maps diagnostics generated from the template back to original line numbers.

### `DocfillySourceUpdateResult`

```ts
interface DocfillySourceUpdateResult {
  source: string;
  isDocfilly: boolean;
  diagnostics: readonly DocfillyDiagnostic[];
}
```

- `source`: updated source; ordinary documents and values that cannot be updated safely retain
  their original content.
- `isDocfilly`: whether the `#!docfilly` marker was recognized.
- `diagnostics`: notices found while parsing the source and saving values.

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

- `code`: stable identifier for application logic.
- `message`: localized, author-facing explanation; English by default.
- `line`: one-based problem line, omitted for document-wide notices.
- `source`: original source line involved.
- `severity`: currently only `"warning"`, which never blocks rendering.

### `DocfillyVariable`

A discriminated union keyed by `type`:

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

## CSS

The library creates structure but does not inject CSS. Optional official styles cover the
responsive form and body layout, controls, Markdown, plain text, rendering fallback, and light
and dark palettes. React uses the same stylesheet.

```ts
import "docfilly/styles.css";
```

The official CSS applies only below `.docfilly`. At a container width of 47.5rem or greater, it
places the form and body side by side; below that width, it stacks them. Colors follow
`prefers-color-scheme`. To select a theme for a particular view, set
`data-docfilly-theme="light"` or `"dark"` on `.docfilly` itself or an ancestor. A setting on
`.docfilly` takes precedence over an ancestor. After importing the stylesheet, custom
`.docfilly` rules can override its custom properties. Without the import, Docfilly generates
structure only.

Public classes available for custom CSS are:

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

### CSS custom properties

Override these `--docfilly-*` properties in a `.docfilly` rule loaded after the official CSS:

| Property                                                          | Purpose                                     |
| ----------------------------------------------------------------- | ------------------------------------------- |
| `--docfilly-color`, `--docfilly-background`                       | Body text and background                    |
| `--docfilly-form-background`                                      | Form background                             |
| `--docfilly-muted-color`, `--docfilly-label-color`                | Instruction and label text                  |
| `--docfilly-border-color`, `--docfilly-field-border-color`        | Container, form, table, and control borders |
| `--docfilly-accent-color`, `--docfilly-focus-ring-color`          | Checkbox, focus ring, and accent            |
| `--docfilly-code-background`                                      | Inline code background                      |
| `--docfilly-code-block-color`, `--docfilly-code-block-background` | Code-block text and background              |
| `--docfilly-spacing`                                              | Base spacing for the form and body          |
| `--docfilly-form-width`                                           | Form-column width in the two-column layout  |
| `--docfilly-sticky-top`                                           | Top offset of the sticky form               |
| `--docfilly-form-max-height`                                      | Maximum height of the sticky form           |

For example, place the form below a fixed header with:

```css
.document-viewer .docfilly {
  --docfilly-accent-color: #0f766e;
  --docfilly-sticky-top: 5rem;
  --docfilly-form-max-height: calc(100dvh - 6rem);
}
```
