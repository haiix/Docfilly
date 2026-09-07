# Getting started

This guide takes authors from their first Docfilly document to a reader-facing preview. It also
shows how to embed the library in another application.

## Create your first document

Save the following as `setup.md`:

````text
#!docfilly
projectName = MyProject
environment = [development, staging, *production]
publish = [x]

---

# Set up [[projectName]]

The target is the **[[environment]]** environment.

```sh
deploy --project [[projectName]] --environment [[environment]]
```
````

Everything before the `---` separator defines fields; everything after it is the body shown to
readers. Blank lines surround the separator so the source also displays cleanly as Markdown.
They are not required by the Docfilly syntax. When readers change `projectName` or `environment`
in the form, the heading, explanation, and command all update to the same values.

Authors place `[[variableName]]` wherever a value is reused. Readers never work with this syntax.
See the [Source format](./03-source-format.md) for the complete grammar.

Use `if` blocks when an entire instruction depends on a checkbox or selected value:

```text
[[#if publish]]
This step is required only when publishing.
[[#endif]]

[[#if environment = production]]
Review the production checklist before continuing.
[[#endif]]
```

## Preview it in the web app

### Requirements

- Node.js 24
- pnpm 11 (the repository pins `pnpm@11.9.0`)
- A browser with DOM APIs

From the repository root, run:

```sh
pnpm install
pnpm dev
```

Open the Vite development server, then select or drag and drop `setup.md`. Changing a form value
updates the customized body—this is the reader's core experience.

You can also open ordinary Markdown or text without the leading `#!docfilly` marker. Docfilly
displays the full document unchanged and does not generate a form.

## Embed the library

The web app currently registers the library as a workspace dependency:

```json
{
  "dependencies": {
    "docfilly": "workspace:*"
  }
}
```

After Docfilly is published to npm or another registry, consumers can install it as a regular
package. Within this repository, use the workspace dependency.

Pass the source to `createDocfilly` and append its returned element to the page:

```ts
import { createDocfilly } from "docfilly";
import "docfilly/styles.css";

const view = createDocfilly(source, "md");
document.body.append(view.element);
```

`view.element` contains the reader form and customized output. Importing
`docfilly/styles.css` opts into the standard styles; JavaScript does not inject them. Omit the
import and style the public classes when integrating with an existing design. Use
`view.diagnostics` to present source problems to authors.

## Render plain text

Pass `"text"` as the second argument:

```ts
const view = createDocfilly("#!docfilly\nname = Alice\n---\nHello, [[name]].", "text");

document.body.append(view.element);
```

Plain-text output is assigned through `textContent`, not `innerHTML`. The official CSS preserves
line breaks and uses a monospace font. If you use custom styles, target
`.docfilly__output--text`.

## Change the render delay

The default delay between an input event and rendering is 200 milliseconds:

```ts
const view = createDocfilly(source, "md", {
  debounceMs: 50,
});
```

After changing an input programmatically, call `view.render()` to update the body immediately.

## Clean up

Call `destroy()` when navigation or another lifecycle event removes the view:

```ts
view.destroy();
```

This clears pending timers and event listeners and removes `view.element` from the DOM.
