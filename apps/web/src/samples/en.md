#!docfilly
> Change the form values and watch this document update.
project_name | Project name = Docfilly
author | Author = Alex Morgan
environment | Environment = [development, *staging, production]
team_work | Working with a team = [x]

---

# [[project_name]] five-minute tutorial

Start by changing **Project name**, **Environment**, and **Working with a team** in the form on the left. The heading and instructions on the right update immediately. On desktop, the form stays below the toolbar as you continue through the document.

Docfilly adds a small set of features to ordinary Markdown and text so readers can adapt a document without repeatedly editing it by hand.

## Document structure

A Docfilly document starts with `#!docfilly`. The **form definition** comes before the `---` delimiter and the **document template** comes after it.

```text
#!docfilly

(form definition)

---

(document template)
```

## 1. Insert text

### Try it in the form

Change **Project name** or **Author**. The same value appears in the result below.

### Form definition

```text
project_name | Project name = Docfilly
author | Author = Alex Morgan
```

The parts are `variable name | label = default value`. The label is optional. Insert a form value in the body by surrounding its variable name with double brackets.

### Document template

```text
The current project is **\[[project_name]]**.
Author: **\[[author]]**
```

### Result

> The current project is **[[project_name]]**.
>
> Author: **[[author]]**

## 2. Choose what to display

### Try it in the form

Choose production for **Environment**. The guidance below changes.

### Form definition

```text
environment | Environment = [development, *staging, production]
```

List dropdown choices in brackets and prefix the default choice with `*`.

### Document template

```text
Current selection: **\[[environment]]**
\[[#if environment = production]]
This is production. Confirm the review and backup before making changes.
\[[#else]]
This is a pre-production environment. Review your changes here.
\[[#endif]]
```

Use `\[[#if variable = value]]` to show content when a condition matches. `\[[#else]]` switches to the alternative, and `\[[#endif]]` ends the condition.

### Result

> Current selection: **[[environment]]**
>
[[#if environment = production]]
> This is production. Confirm the review and backup before making changes.
[[#else]]
> This is a pre-production environment. Review your changes here.
[[#endif]]

## 3. Switch instructions with a checkbox

### Try it in the form

Toggle **Working with a team**. The workflow below changes.

### Form definition

```text
team_work | Working with a team = [x]
```

`[x]` creates a checked checkbox and `[ ]` creates an unchecked one.

### Document template

```text
\[[#if team_work]]
### Team workflow

1. Create a working branch.
2. Request a review after making your changes.
\[[#else]]
### Individual workflow

1. Review your changes locally.
2. Record what you changed.
\[[#endif]]
```

### Result

[[#if team_work]]
> ### Team workflow
>
> 1. Create a working branch.
> 2. Request a review after making your changes.
[[#else]]
> ### Individual workflow
>
> 1. Review your changes locally.
> 2. Record what you changed.
[[#endif]]

## Try your own document next

1. Download this source with **Save as Docfilly**.
2. Edit the form definition or body in a text editor.
3. Open the edited file again with **Open file**.

See the [detailed Docfilly format specification](https://github.com/haiix/Docfilly/blob/main/documents/03-source-format.md) for every supported feature.
