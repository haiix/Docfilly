# Source format

The Docfilly format lets authors define reader-facing fields and explanatory content. Readers
see the generated form and a body customized with their values, not the field definitions or
reference syntax.

The syntax is deliberately small and keeps ordinary Markdown and text understandable when the
source is opened directly.

## Document structure

A Docfilly document consists of a marker, a field area, and a body. A line containing three
ASCII hyphens separates the fields from the body.

```text
#!docfilly
> Complete the required fields.
variableName | Reader-facing label = Default value

---

Use [[variableName]] in the body.
```

## Marker

Put this marker on the first line:

```text
#!docfilly
```

Only a file with this marker is parsed as Docfilly. Write it in lowercase without spaces as
shown. Recognition is case-insensitive, permits surrounding whitespace, and also works after a
UTF-8 byte order mark (BOM).

Without the marker, the complete source is displayed as ordinary Markdown or text even if it
contains `---` or `[[...]]`. This prevents accidental interpretation of ordinary documents.
Add the marker to documents created before it was introduced; the unmarked legacy format is not
detected because doing so could misinterpret regular Markdown.

## Separator and blank lines

Whitespace around the separator is accepted, so a line such as `  ---  ` works. Prefer an
unadorned `---` for clarity.

For Markdown, leave a blank line before the separator. Without one, a regular Markdown viewer
may interpret the preceding field and `---` as a Setext heading. A blank line after the
separator also makes the source easier to read as Markdown.

These blank lines are not required by Docfilly and their presence produces no different fields
or diagnostics. Content after the separator is preserved as the body. Consequently, a blank
line immediately after it is mostly invisible in Markdown but remains the first line of
plain-text output.

If a marked document has no separator, Docfilly displays everything after the marker as the body
and returns a diagnostic.

## Common field rules

- Define one field per line.
- Blank lines are ignored.
- A line whose trimmed content begins with `#` is an author-only comment.
- The first `=` outside quotes separates the name and label on the left from the default value
  on the right.
- Only the first such `=` is a separator, so text values may contain `=`.
- A variable name may contain letters from any language, including Japanese characters, digits,
  and underscores. It cannot contain spaces or hyphens.
- If the label is omitted, the variable name is used as the form label.
- When a name is defined more than once, the first definition wins.
- Both LF and CRLF line endings are supported.
- A UTF-8 BOM at the beginning of the document is removed automatically.

```text
#!docfilly
# Author-only comment
project_name | Project name = Docfilly
author = Alice
タイトル = First document
query = category=document

---

...
```

## Form instructions

Start a line with `>` to show requirements, warnings, or operating instructions inside the
form. Instructions and fields appear in source order. Consecutive instruction lines remain
separate elements rather than being joined.

```text
#!docfilly
> Complete the required fields.
project_name | Project name = Docfilly
> Production deployments require prior approval.
environment | Environment = [development, *staging, production]

---

...
```

After trimming the whole line, Docfilly removes one whitespace character immediately following
`>` as syntax. A line containing only `>` creates an empty instruction.

Instructions are plain text. HTML and Markdown are not interpreted, and placeholders, filters,
and `if` directives are not evaluated. Instructions have no value and do not appear in the
public `variables` or `values` collections. The form area is present even when it contains
instructions but no fields.

Lines beginning with `#` remain hidden author comments. A line that begins with neither `>`
nor `#` and has no `=` is skipped with a `missing-equals` diagnostic.

## Quoting and escaping

A label, text default, or individual dropdown option may be enclosed in ASCII double quotes.
Represent a literal double quote inside a quoted value as `""`, as in CSV.

```text
message | "Display | details = more" = "She said ""yes"""
region | Region = ["Tokyo, Japan", *"Osaka, Japan", Other]
```

- Whitespace around an unquoted field is trimmed.
- Leading and trailing whitespace inside quotes is preserved.
- Values without delimiter characters may also be quoted.
- Variable names cannot be quoted. Use a label for unrestricted reader-facing text.
- A quoted value must close on the same line; multiline quoted values are unsupported.
- An unclosed quote, characters after a closing quote, or a `"` in the middle of an unquoted
  value makes the definition invalid. It is skipped with an `invalid-quoting` diagnostic.

Before quoting was introduced, the quotes in `title = "Docfilly"` were part of the value. They
now delimit a CSV-style value, so the default is `Docfilly`. To include quotes around the
value, write `title = """Docfilly"""`.

## Text fields

A value not enclosed in square brackets creates a text field.

```text
project_name | Project name = Docfilly
author = Alice
```

The generated element is `<input type="text">`. Its `name` attribute is the variable name,
and its initial value is the text to the right of `=`.

An empty value is valid:

```text
memo | Notes =
```

Quote a string that would otherwise look like a checkbox or dropdown:

```text
checkbox_example = "[x]"
list_example = "[one, two]"
```

## Dropdowns

A comma-separated list inside square brackets creates dropdown options:

```text
environment | Environment = [development, staging, production]
```

The generated element is `<select>`. Its initial option is:

- the option marked with `*`, when present; otherwise
- the first option.

```text
environment | Environment = [development, *staging, production]
```

The initial value above is `staging`; the `*` is not part of the value.

Quote a complete option when it contains a comma or quote. Put an initial-selection `*` outside
the quotes. A `*` at the start of quoted text is part of the value.

```text
region = ["Tokyo, Japan", *"Osaka, ""Central""", "*regular value"]
```

Empty options are skipped while valid options remain. If every option is empty, Docfilly
recovers by displaying an ordinary text field.

## Checkboxes

```text
enabled | Enable = [x]
also_enabled | Enable this too = [X]
disabled | Disabled option = [ ]
```

- `[x]`: initially on
- `[X]`: initially on; the marker is case-insensitive
- `[ ]`: initially off

The canonical notation is `[x]`. `[True]` and `[False]` are not checkboxes; each is a
single-option dropdown with the value `True` or `False`.

A checkbox substitutes `true` when on and `false` when off. Quoting the entire value, as in
`"[x]"`, instead creates a text field whose default is `[x]`.

## References in the body

Enclose a variable name in double square brackets wherever the reader's value should appear.
References exist only in authoring source; rendered output contains the current value.

```markdown
# [[project_name]]

Author: [[author]]
Environment: [[environment]]
Enabled: [[enabled]]
```

Placeholders accept the same non-ASCII letters, digits, and underscores as variable names. An
undefined placeholder remains unchanged and adds a diagnostic. A variable may be referenced any
number of times, including inside Markdown code blocks.

## String case filters

Append `|` and a filter name inside a placeholder to transform the value's case. Whitespace
around a pipe is optional.

```text
[[project_name | upper]]
[[project_name | snake | upper]]
```

Filters run from left to right. Six filters are available:

- `upper`: convert the entire string to uppercase
- `lower`: convert the entire string to lowercase
- `snake`: lowercase words joined by `_`
- `kebab`: lowercase words joined by `-`
- `pascal`: capitalize each word and join them
- `camel`: lowercase the first word, capitalize subsequent words, and join them

`snake`, `kebab`, `pascal`, and `camel` split words at whitespace, symbols such as `_` and
`-`, and uppercase boundaries. For example, `Project APIClient-name` becomes
`project_api_client_name` with `snake`.

A placeholder containing an unknown or empty filter, undefined variable, or invalid variable
name remains unchanged and adds a diagnostic. Filter arguments, user-defined filters, and
JavaScript execution are not supported.

## Conditional blocks

Use the `#if`, `#else`, and `#endif` directives to vary body content by field value.
`#else` is optional.

```text
[[#if published]]
This content appears when published is on.
[[#else]]
This content appears when published is off.
[[#endif]]
```

Each `[[#...]]` line is a directive. The range from `#if` through `#endif` is a conditional
block.

### Syntax rationale

The directives are intended to be understandable without programming or template-engine
experience and to remain traceable in directly opened source.

- Every directive starts with `#`, avoiding collisions with references such as `[[else]]`.
- `#endif` communicates its purpose more directly than a tag-like `/if`.
- Comparisons use `=`, familiar from fields and spreadsheets, rather than `==`.
- Directives occupy complete lines to preserve readability and reliable error recovery.
- Text fields and dropdowns require an explicit comparison instead of implicit truthiness.
- There are no complex expressions or arbitrary code evaluation.

### Directive lines

A directive must be the only non-whitespace content on its line. Leading and trailing whitespace
is allowed. The canonical keywords `if`, `else`, and `endif` are lowercase.

```text
  [[#if published]]
Visible body content
  [[#endif]]
```

Directive-like syntax embedded in a sentence is displayed literally:

```text
Switch only the [[#if published]] part of this sentence.
```

These rules apply to Markdown and plain text, including Markdown code blocks.

### Checkbox conditions

Test a checkbox by name. On is true and off is false.

```text
[[#if published]]
Shown only when published is on.
[[#endif]]
```

Checkboxes cannot be compared with `= true` or another value.

### Text and dropdown conditions

Compare text fields and dropdowns with `=` or `!=`.

```text
[[#if environment = production]]
Production instructions.
[[#endif]]

[[#if environment != production]]
Non-production instructions.
[[#endif]]
```

Comparison is exact and case-sensitive. The left side is one defined variable; the right side is
a string, never another variable.

Use the field syntax's CSV-style quoting for values containing whitespace, commas, `=`, `!=`,
or quotes. Whitespace outside quotes is trimmed; whitespace inside quotes is preserved.

```text
[[#if environment = "staging, preview"]]
Preview instructions.
[[#endif]]

[[#if message = "She said ""yes"""]]
A value containing quotes.
[[#endif]]

[[#if memo = ""]]
Shown when memo is empty.
[[#endif]]
```

A text field or dropdown cannot be tested by its name alone. Write `= ""` for an empty string
or `!= ""` for a nonempty string.

### Nesting

Conditional blocks may be nested to express successive conditions without logical operators:

```text
[[#if published]]
[[#if environment = production]]
Published production instructions.
[[#endif]]
[[#endif]]
```

The maximum depth is 32. This is a safety limit against pathological input, not an authoring
recommendation. Keep nesting shallow enough to follow in the raw document. At depth 33 and
beyond, Docfilly preserves the block and returns an `if-nesting-too-deep` diagnostic.

`elseif`/`elif`, `and`, `or`, `not`, ordered comparisons, regular expressions,
variable-to-variable comparisons, and comparisons after applying filters are unsupported. Use
`!=` or `#else` for negative conditions.

### Display syntax literally

Put a backslash before the first `[` to display a placeholder or directive literally:

```text
\[[project_name]]
\[[#if published]]
```

The backslash is removed in output, which displays `[[project_name]]` and
`[[#if published]]`. This applies equally to Markdown, plain text, and code blocks.

### Invalid conditional blocks

Treating an invalid condition as false and dropping its content could hide critical
instructions. Docfilly therefore preserves source it cannot interpret and returns diagnostics
with line numbers.

- Undefined condition variable, incompatible field type, or invalid comparison value: preserve
  the entire block
- Missing `#endif`: preserve from `#if` through the end of the document
- `#else` or `#endif` without a matching `#if`: preserve that directive line
- Repeated `#else` in one block: preserve the entire block
- Nesting past the limit: preserve the block beyond the limit

Valid surrounding content and blocks are still evaluated. Placeholders inside a preserved
invalid block are not substituted.

## Complete example

````text
#!docfilly
# Project information
> Enter the target project's details.
project_name | Project name = AppService
environment | Environment = [development, *staging, production]
port | Port = 8080
> Review the publication settings.
use_docker | Use Docker = [x]
published | Publish = [x]

---

# [[project_name]] build guide

Target environment: **[[environment]]**

```sh
npm run start -- --port=[[port]] --env=[[environment]]
```

Docker enabled: `[[use_docker]]`

[[#if published]]
[[#if environment = production]]
These instructions target a published production deployment.
[[#endif]]
[[#endif]]
````

## Error recovery

Docfilly keeps a document readable when part of its source is invalid. It uses valid fields and
body content and adds English diagnostics by default so the author can fix the problem. Pass a
supported locale explicitly to request another diagnostic language.

### Missing separator

Everything after the marker is displayed as body content, and no form fields are generated.

```text
#!docfilly
# Markdown displayed as body content

This remains visible without a separator.
```

### Missing marker

The entire file is displayed as an ordinary document. This is normal behavior, not a diagnostic.

```markdown
# Ordinary Markdown

---

This separator remains part of the Markdown.
```

### Missing `=`

Only that field line is skipped; other fields and body content remain.

```text
#!docfilly
name Alice
title = Docfilly
---
[[title]]
```

### Invalid variable name

Names containing spaces or hyphens are skipped. Non-ASCII names remain valid.

```text
#!docfilly
project-name = Docfilly
タイトル = First document
---
[[タイトル]]
```

### Duplicate name

The first definition wins and later definitions with the same name are skipped.

```text
#!docfilly
name = Alice
name = Bob
---
Hello
```

### Empty dropdown option

Only empty options are removed, producing a dropdown with `development` and `production`.

```text
#!docfilly
environment = [development, , production]
---
[[environment]]
```

### Invalid quoting

A field with an unclosed quote or another quoting error is skipped while valid fields and the
body remain visible.

```text
#!docfilly
broken = "unclosed value
title = Docfilly
---
[[title]]
```

## Inspect diagnostics

Read `diagnostics` from either a parse result or rendering instance:

```ts
const view = createDocfilly(source, "md");

for (const diagnostic of view.diagnostics) {
  console.log(diagnostic.message);
}
```

`view.element` and `view.output` are still created when diagnostics are present.
