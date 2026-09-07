# Docfilly documentation

Docfilly moves the instruction “replace this value for your environment” out of a reader's head
and into a form. After readers provide the required values, Docfilly displays customized
Markdown or plain text.

Authors add a small set of fields and `[[variableName]]` references to an ordinary document.
Readers do not need to learn that syntax; they interact only with the form and customized
content.

English is the canonical and only maintained language for project documentation. Older versions
in other languages remain available in Git history.

## Choose a path

- **Understand the idea** — [Overview](./01-overview.md)
- **Author a document** — [Getting started](./02-getting-started.md) and
  [Source format](./03-source-format.md)
- **Embed Docfilly** — [API reference](./04-api-reference.md),
  [Security and limitations](./07-security-and-limitations.md), and
  [Diagnostic localization](./08-diagnostic-localization.md)
- **Develop this repository** — [Web app](./05-web-demo.md),
  [Development and testing](./06-development-and-testing.md), and
  [npm publication plan](./09-npm-publication-plan.md)

## Documentation index

1. [Overview](./01-overview.md) — the problem, authors and readers, and design principles
2. [Getting started](./02-getting-started.md) — your first Docfilly document and library setup
3. [Source format](./03-source-format.md) — fields, references, directives, and error recovery
4. [API reference](./04-api-reference.md) — functions, classes, types, and events
5. [Web app](./05-web-demo.md) — reader-facing viewer behavior and implementation
6. [Development and testing](./06-development-and-testing.md) — commands, builds, tests, and CI
7. [Security and limitations](./07-security-and-limitations.md) — sanitization, supported
   environments, and known limits
8. [Diagnostic localization](./08-diagnostic-localization.md) — locale APIs, resolution, and
   adding a language
9. [npm publication plan](./09-npm-publication-plan.md) — future publication decisions,
   authentication, validation, and ordering

## Try the web app locally

```sh
pnpm install
pnpm dev
```

Open the development server and select or drop a `.md`, `.markdown`, or `.txt` file in the empty
state. If you do not have a local file, choose **Open sample** to explore text fields, dropdowns,
checkboxes, and body substitution in a five-minute built-in tutorial. You can save the tutorial
as Docfilly source, edit it, and open it again.

To create a document of your own, continue with [Getting started](./02-getting-started.md).
