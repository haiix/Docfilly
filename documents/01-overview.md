# Overview

## The problem Docfilly solves

Instructions and setup guides often say something like:

> Replace `YOUR_PROJECT_NAME` with the name of your project.

Readers must identify each placeholder, find the correct value, and remember that value while
continuing through the document. Every repeated substitution takes attention away from the
instructions themselves.

Docfilly moves those substitutions into a form. Readers provide the required values first and
then follow a document customized for their environment.

```text
Traditional: Read → find a placeholder → look up a value → substitute mentally → keep reading
Docfilly:    Enter values → read your customized document → follow the instructions
```

This is more than string replacement. Docfilly turns an implicit cognitive task into an explicit
input step so readers can concentrate on the content.

## Authors and readers

### Authors

Authors create instructions or the templates behind them. They are not expected to know
programming or a template engine.

An author defines reader-provided fields at the beginning of ordinary Markdown or plain text and
uses `[[variableName]]` where a value belongs in the body.

````text
#!docfilly
projectName = MyProject
environment = [development, staging, *production]

---

# Set up [[projectName]]

```sh
deploy --project [[projectName]] --environment [[environment]]
```
````

Docfilly keeps its syntax small so the source remains easy to follow when opened directly.

### Readers

Readers follow documents rendered by Docfilly. They do not need to understand constructs such as
`#!docfilly` or `[[variableName]]`.

They provide values for their environment through the form. Docfilly then uses those same values
throughout headings, explanations, command examples, and other content.

## Product philosophy

Docfilly is not a general-purpose template engine. It favors making human-readable documentation
easier for each reader over complex expressions, scripts, and other advanced templating features.

Authors get a deliberately limited format; readers get only a form and the customized document.
The document—not operation of the app—remains the focus.

## Design principles

1. **Do not require syntax knowledge from readers.** Readers use a form and the resulting
   document.
2. **Keep the authoring learning curve low.** Authors add only a few constructs to Markdown or
   plain text.
3. **Keep source documents readable.** Content should remain understandable when opened without
   Docfilly whenever possible.
4. **Keep the document central.** Docfilly assists reading; learning the app is not the goal.
5. **Turn substitution into input.** Gather repeated mental replacements in one explicit step.
6. **Remain readable when source has problems.** Recover from minor mistakes and return useful
   diagnostics instead of blocking the reader.
7. **Render safely.** Sanitize Markdown HTML and never execute form input as HTML.

## Main capabilities

- Generate text fields, dropdowns, and checkboxes from document definitions
- Substitute reader values into `[[variableName]]` references in real time
- Include or omit `if` blocks based on checkbox and dropdown values
- Render Markdown and plain text
- Sanitize HTML generated from Markdown
- Display ordinary Markdown or text without a form
- Report invalid definitions and automatic recovery as author-facing diagnostics
- Support non-ASCII variable names, including Japanese characters, as well as LF, CRLF, and a
  UTF-8 BOM
- Expose the form, output element, output source, and current values through the embedding API

## Processing flow

1. The application obtains the document source string.
2. It passes the source and its type (`"md"` or `"text"`) to `createDocfilly`.
3. If the first line is `#!docfilly`, Docfilly parses fields before the separator.
4. It creates a reader-facing form for those fields.
5. It evaluates `if` blocks and substitutes references using the current form values.
6. It converts Markdown to HTML or displays plain text directly.
7. When a field changes, it rerenders after 200 milliseconds by default.
8. If source cannot be interpreted completely, it returns diagnostics while keeping the
   document visible.

Source without `#!docfilly` on the first line is an ordinary document. Docfilly displays it in
full without generating a form.

## Monorepo layout

```text
Docfilly/
├─ apps/
│  └─ web/                  Web app
├─ packages/
│  ├─ docfilly/             Core library
│  └─ react/                React adapter
├─ documents/               Project documentation
├─ package.json
└─ pnpm-workspace.yaml
```

The libraries use Vite library mode to produce ES Modules and CommonJS, along with TypeScript
declarations. The web app consumes the library source through the pnpm workspace.

## Supported environment

The `Docfilly` rendering class targets browsers and depends on DOM APIs such as `document`,
`HTMLInputElement`, and `CustomEvent`. Creating an instance under Node.js requires a DOM
implementation such as jsdom. Use `parseDocfillySource` for DOM-independent parsing.
