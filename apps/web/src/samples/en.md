#!docfilly
> Change the form values and watch this document update.
project_name | Project name = Docfilly
environment | Environment = [development, *staging, production]
author | Author = Alex Morgan
team_work | Working with a team = [x]

---

# [[project_name]] five-minute tutorial

Start by changing the form on the left. The document on the right updates immediately.

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

The Project name field comes from this definition:

```text
project_name | Project name = Docfilly
```

The parts are `variable name | label = default value`. Insert a form value in the body by surrounding its variable name with double brackets.

```text
\[[project_name]]
```

> The current project is **[[project_name]]**.

> Author: **[[author]]**

## 2. Choose what to display

Environment is a dropdown. List its choices in brackets and prefix the default choice with `*`.

```text
environment | Environment = [development, *staging, production]
```

> Current selection: **[[environment]]**

[[#if environment = development]]
> Use development settings to check local changes quickly.
[[#endif]]
[[#if environment = staging]]
> Validate the release in staging before it reaches production.
[[#endif]]
[[#if environment = production]]
> This is production. Confirm the review and backup before making changes.
[[#endif]]

## 3. Switch instructions with a checkbox

`[x]` creates a checked checkbox and `[ ]` creates an unchecked one. Conditions let the document show only the relevant steps.

```text
team_work | Working with a team = [x]

\[[#if team_work]]
### Team workflow
\[[#else]]
### Individual workflow
\[[#endif]]
```

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
