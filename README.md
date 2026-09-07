# Docfilly

Docfilly is a document format and rendering library that turns the mental substitutions
readers make while following instructions into a short form they complete up front.

Instead of repeatedly replacing `YOUR_PROJECT_NAME` with the name of their own project,
readers enter the project name once. Docfilly then renders a version of the document with
that value in place, so readers can focus on the instructions rather than on substitution.

Docfilly serves two groups:

- **Authors** add a small amount of syntax to ordinary Markdown or plain text to define the
  information readers should provide. No programming or template-engine experience is
  required.
- **Readers** do not need to understand the syntax. They fill in values for their environment
  and read the customized document.

Docfilly is not intended to be a general-purpose template engine. Its purpose is to make
**human-readable documentation easier for each reader to follow**.

Try it in the [Docfilly web app](https://haiix.github.io/Docfilly/).

## How it works

An author defines fields at the beginning of a document and marks values that should be
substituted in the body with `[[variableName]]`.

````text
#!docfilly
projectName = MyProject
environment = [development, staging, *production]

---

# Set up [[projectName]]

Run the following command:

```sh
deploy --project [[projectName]] --environment [[environment]]
```
````

The reader sees fields for `projectName` and `environment`, followed by a document rendered
with the selected values. In Markdown, leave a blank line before `---` so the field above it is
not interpreted as a Setext heading when the source is viewed directly. The blank line does not
affect Docfilly parsing. A file without `#!docfilly` on its first line is rendered unchanged as
ordinary Markdown or plain text.

See the [Docfilly documentation](./documents/README.md) for complete usage and format details.

## Design principles

1. Readers should not need to learn Docfilly syntax.
2. Authors should need only a small, understandable set of constructs.
3. Source Markdown and text should remain as readable as possible when opened directly.
4. The document and its content—not the app—should remain the focus.
5. Repeated mental substitution should become one explicit form entry.

When source contains a problem, Docfilly renders as much as it can and returns diagnostics that
help the author correct it.

## Repository layout

- `packages/docfilly`: framework-independent TypeScript library built with Vite
- `packages/react`: React adapter for `docfilly`
- `apps/web`: Vite web app powered by `docfilly`
- `documents`: detailed guides for usage, the source format, APIs, and development
- [`brand`](./brand/README.md): source artwork, generation settings, and web icon instructions

## Development

```sh
pnpm install
pnpm dev
```

See [Development and testing](./documents/06-development-and-testing.md) for build, static
analysis, Vitest, Playwright, and CI details. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the
issue, pull request, versioning, deployment, and release workflows.

## Core library API

```ts
import { createDocfilly } from "docfilly";
import "docfilly/styles.css";

const source = `#!docfilly
projectName = MyProject

---

# [[projectName]]
`;

const view = createDocfilly(source, "md");
document.body.append(view.element);

view.form; // Form completed by the reader
view.output; // Element containing the customized document
view.isDocfilly; // Whether the #!docfilly marker was recognized
view.outputSource; // Current output source after substitutions
view.values; // Current form values
view.diagnostics; // Author-facing notices about recovery and skipped input
```

Pass `"md"` or `"text"` as the second argument to `createDocfilly`. Markdown HTML is sanitized
with DOMPurify. Standard styles are not injected automatically; they apply only when you import
the CSS as shown above. Omit the import and style the public CSS classes for a custom theme.

Use `updateDocfillyDefaults` to save the current form values back into the source as defaults
for the next session.

```ts
import { updateDocfillyDefaults } from "docfilly";

const updated = updateDocfillyDefaults(source, view.values);

if (updated.isDocfilly) {
  await saveTextFile(updated.source);
}
```

This API updates only valid variable definitions in the header. It preserves the body,
comments, labels, and variable order. It leaves ordinary documents unchanged and retains the
original default for values that cannot be saved, reporting the reason in `diagnostics`.

The web app opens `.md`, `.markdown`, and `.txt` files through a picker or drag and drop. Its
built-in sample, available from the empty state and Help dialog, demonstrates text fields,
dropdowns, checkboxes, and body templates in about five minutes. The sample can be saved as a
Docfilly file, edited, and opened again. Files are processed entirely in the browser and are not
uploaded to a server.

## React API

Use `@docfilly/react` with React 18 or 19.

```sh
pnpm add @docfilly/react react react-dom
```

```tsx
import { DocfillyView } from "@docfilly/react";
import "docfilly/styles.css";

<DocfillyView
  source={source}
  sourceType="md"
  options={{
    locale: "en",
    debounceMs: 200,
    initialValues: new Map([
      ["title", "Saved title"],
      ["published", "true"],
    ]),
  }}
  className="document-preview"
  onRender={({ outputSource, values, diagnostics, isDocfilly }) => {
    console.log({ outputSource, values, diagnostics, isDocfilly });
  }}
/>;
```

`DocfillyView` creates a Docfilly instance when mounted and recreates it when the contents of
`source`, `sourceType`, `options.locale`, `options.debounceMs`, or `options.initialValues`
change. It destroys the instance when unmounted. `onRender` runs after the initial render and
after each form-driven update. Changing only the callback, or passing a new `initialValues` Map
with the same contents, preserves the current form state. Diagnostics default to English; pass
`locale: "ja"` for Japanese. See
[Diagnostic localization](./documents/08-diagnostic-localization.md).

`HTMLAttributes<HTMLDivElement>` such as `className`, `id`, and `aria-*` are forwarded to the
outer wrapper. `onRender` receives the current `outputSource`, `values` as a `ReadonlyMap`,
`diagnostics`, and `isDocfilly`.

Call `flush()` through a ref before export or submission to apply any pending debounced render.
It returns the latest `outputSource`, or `null` if the view is not available yet.

```tsx
import { useRef } from "react";
import { DocfillyView, type DocfillyViewHandle } from "@docfilly/react";

const viewRef = useRef<DocfillyViewHandle>(null);

<DocfillyView ref={viewRef} source={source} sourceType="md" />;
const latestSource = viewRef.current?.flush();
```

See [Development and testing](./documents/06-development-and-testing.md) for testing guidance.
