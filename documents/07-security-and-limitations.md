# Security and limitations

Because Docfilly inserts reader input into documents, it prioritizes safe rendering alongside an
experience in which readers do not need to understand the syntax.

## Markdown output safety

Markdown is processed in three stages:

1. Evaluate parsed conditional blocks using current values.
2. HTML-escape form values before inserting them into the body.
3. Convert the Markdown with `marked`, then sanitize the HTML with DOMPurify.

As a result, a reader value containing `<script>` or an event handler is not inserted as
executable DOM. HTML written by the author in the Markdown body is also sanitized in the final
stage.

Conditional syntax is parsed once before values are inserted. A form value containing
`[[#endif]]`, for example, is never reinterpreted as a directive. Conditions cannot execute
arbitrary JavaScript.

## Plain-text output safety

Plain text is assigned through `textContent`, not `innerHTML`. HTML-like strings are not
interpreted as markup.

## File handling

The web app uses only the browser File API to read selected files. It contains no operation that
uploads their contents to a server.

When embedding Docfilly elsewhere, the host application is responsible for storage, upload,
logging, and other data handling. For confidential documents, review every communication path,
not only Docfilly.

## Content Security Policy

Docfilly does not generate inline scripts. Applications should still define a Content Security
Policy that limits scripts and connection destinations to what they need.

## Current limitations

### Browser-oriented rendering

The `Docfilly` class requires DOM APIs. Direct construction during SSR or under Node.js requires
a DOM implementation. Use `parseDocfillySource` for parsing without the DOM.

### Deliberately simple, line-oriented syntax

Field definitions use a simple one-line format:

- Defaults cannot span lines.
- Labels, defaults, and dropdown options support CSV-style quoting, but quoted values cannot
  span lines.
- Variable names cannot be quoted.
- Variable names may contain letters from any language, including Japanese characters, digits,
  and underscores, but not spaces or hyphens.
- Conditional blocks are limited to whole-line directives, checkbox tests, and string
  comparisons using `=` or `!=`.
- Conditional nesting is limited to 32 levels. There are no complex expressions, logical
  operators, or loops.
- Case conversion uses fixed built-in filters only; filters have no arguments or user-defined
  functions.
- Variables have no per-variable type validation or input constraints.

### Leading marker required

The first line must contain `#!docfilly` for fields to be parsed. Without it, a file is displayed
as an ordinary document even if it contains field-like lines or `---`. This prevents existing
Markdown and text from being interpreted accidentally.

### No automatic Markdown detection

The library does not infer type from the source string. Callers pass `"md"` or `"text"`. The
web app detects type from the filename extension.

### CSS is opt-in

The library provides meaningful classes and official styles at `docfilly/styles.css`, but does
not inject CSS from JavaScript. Import the standard stylesheet explicitly or define host styles.
The official CSS is scoped below `.docfilly` and does not depend on global elements or
application-specific variables.

### Initial render event

The initial render completes during instance construction. A `docfilly:render` listener added
after construction cannot observe that first event. Read `outputSource` or `output` for the
initial result.

## Recovery from invalid source

Docfilly does not stop readers because of document syntax problems. It recovers conservatively
by skipping unreadable definitions, using the first duplicate, or falling back to a text field.

If Markdown conversion fails unexpectedly, Docfilly displays the output source as plain text and
returns a `markdown-render-fallback` diagnostic.

Recovery details are stored in `diagnostics`. Host applications should present them where they
help authors without interrupting readers.

```ts
const view = createDocfilly(source, sourceType);
container.replaceChildren(view.element);

if (view.diagnostics.length > 0) {
  showNotices(view.diagnostics.map((item) => item.message));
}
```

Docfilly does not guarantee recovery from runtime failures outside format parsing, including file
I/O errors, an environment without required DOM APIs, or exhausted memory.
