# Web app

## Overview

`apps/web` is a local document viewer built with React, TypeScript, Vite, and
`@docfilly/react`. It starts in an empty state instead of opening a document automatically.
Readers choose a local file or built-in sample, then see a form and the document customized by
its values.

The central experience is entering required values once and then reading a relevant document
without needing to understand Docfilly syntax.

```sh
pnpm dev
```

## Supported files

- `.md`
- `.markdown`
- `.txt`

`.md` and `.markdown` files are Markdown. Other accepted files are plain text.

## Opening a file

1. Select a document from **Open file** in the toolbar or empty state, or drop a file anywhere
   in the window.
2. The app reads the source with File API's `file.text()`.
3. It determines `"md"` or `"text"` from the filename.
4. React document state is updated and the source and type are passed to `DocumentViewer`.
5. `DocumentViewer` renders `DocfillyView` from `@docfilly/react`. A leading
   `#!docfilly` marker produces a reader form; unmarked source is displayed as an ordinary
   document.
6. The app receives values, diagnostics, and document kind through `onRender` and updates its
   status and diagnostic list. The React adapter owns instance creation and cleanup.
7. Document metadata and form values are saved to IndexedDB for optional restoration on the
   next launch.

```tsx
const source = await file.text();
const sourceType = file.name.endsWith(".md") ? "md" : "text";
setDocument({ name: file.name, source, sourceType });

<DocfillyView source={document.source} sourceType={document.sourceType} onRender={handleRender} />;
```

The implementation also recognizes `.markdown`. When Docfilly skips or recovers source, the
toolbar status area exposes the diagnostics.

A full-window overlay appears only while files are being dragged. Drags without files are
ignored, and the browser's default navigation to a dropped file is prevented. The app accepts
one file at a time. Multiple files, unsupported extensions, and read failures leave the current
document intact and show guidance in the status area.

## Privacy and on-device data

Selected files are read through the browser File API. The viewer has no upload flow or external
API communication, so their contents are not sent to a server.

By default, IndexedDB in the current browser profile stores one most-recent document: its
filename, original source, Markdown or text type, current form values, update time, and storage
schema version. The app does not keep a document history. User documents are never placed in
Cache Storage or passed to the service worker.

Turn off **Restore the previous document** under the **Document** settings to delete the saved
restoration record and stop saving documents or form values opened afterward. The currently
visible document stays open. Turning restoration on again begins by saving the visible document
and current values. This preference is stored separately from document data.

On a shared device, use **Close document** when finished. This returns to the empty state and
deletes the restorable filename, source, type, and form values. It does not modify the original
local file or any downloaded files.

## Installation and offline use

After opening the GitHub Pages viewer online once, install it through a supported browser. The
exact command varies by browser; look for **Install**, **Install app**, or **Add to Home Screen**
in the address bar or browser menu. The installed app opens in standalone mode.

The service worker stores the application shell in Cache Storage: HTML, JavaScript, CSS, icons,
and the bundled English and Japanese UI resources and samples. After the first load completes,
the app can start offline and can display either sample, open local files, update forms, save
Docfilly source, and export rendered output. External links, the first load, and the first launch
after browser site data has been cleared require a network connection.

User documents and form values are not sent to the service worker or stored in Cache Storage.
Versioned preferences for language, theme, and document restoration use `localStorage`, separate
from the IndexedDB restoration record.

**Reset app data** in **Data and privacy**:

- clears user preferences, restoring language and theme to system settings and document
  restoration to its enabled default;
- closes the displayed document and deletes its IndexedDB restoration record;
- deletes Docfilly-owned Workbox caches; and
- unregisters the service worker whose scope is exactly `/Docfilly/`.

It does not delete caches belonging to other apps on the same origin. The confirmation explains
that the next use requires a network connection, that the installed app itself is not
uninstalled, and that original local and downloaded files are not deleted. After a reset, the
page does not reload automatically and does not recreate the service worker or offline cache
until the page is closed. Partial deletion failures produce a warning. The next online visit
downloads the application assets again and restores offline capability.

### Ownership boundary for app-data reset

Cache Storage is shared per origin. A cache is considered Docfilly-owned only when both of these
conditions hold:

- its name begins with the current Docfilly-specific `docfilly-` prefix, or the supported legacy
  Workbox `workbox-` prefix; and
- its name ends with the complete URL of Docfilly's service-worker registration scope.

Both the prefix and exact scope suffix must match. Reset must never delete all Cache Storage,
match only a prefix, or use a partial scope URL. An unidentified cache is treated as belonging
to another project on the origin and is retained.

Likewise, a service-worker registration is removed only when its `scope` exactly equals the
Docfilly scope URL. Parent, child, and other same-origin scopes remain registered.

Any future change to Workbox `cacheId`, cache naming, deployment base path, or service-worker
scope must update this ownership test at the same time. Regression tests must prove that current
and supported legacy caches are removed while Workbox caches for other scopes, unrelated
caches, and service workers for other scopes remain.

When a new deployment is available, an update prompt appears at the bottom of the screen.
**Reload to update** activates the new service worker and removes obsolete caches. **Later**
continues the current session. Because the visible document and values are stored in IndexedDB,
they can be restored after the update reload.

## Restoring documents and form state

When restoration is enabled, opening a document saves its metadata and values from the first
render to IndexedDB. Form changes are saved after rendering with an additional 500-millisecond
delay to avoid writing after every keystroke. Turning restoration off cancels pending work,
waits for an in-progress save, and then deletes the record so delayed writes cannot recreate it.

At startup, valid saved data restores the original source and type and supplies saved form values
to `DocfillyView.initialValues`. The app announces that it restored the previous document. With
no saved data, it shows the normal empty state.

Every stored field is validated on read. Corrupt data, or an unknown schema version that cannot
be migrated safely, is deleted and the app starts empty. If IndexedDB itself is unavailable, a
notification is shown but document viewing remains available.

**Close document** cancels pending saves, returns to the empty state, and deletes restoration
data so the closed document cannot be saved again. Original local and downloaded files remain
unchanged.

## Empty state and samples

The empty state makes opening a file the primary action. **Open sample**, also available in
Help, explicitly loads the built-in Markdown tutorial. Closing a document returns to this state.

The sample takes about five minutes and lets readers change three field types while observing
the relationship between definitions, placeholders, and conditions:

- text input;
- dropdown; and
- checkbox.

The text input demonstrates `[[variableName]]` substitution, the dropdown changes guidance by
selected value, and the checkbox switches between team and individual instructions with
`[[#if ...]]` and `[[#else]]`. Syntax shown in explanatory code blocks escapes the first `[`
with a backslash so the example itself is not substituted or evaluated.

The tutorial ends by directing readers to **Save as Docfilly**, editing the downloaded source,
opening it again, and consulting the [Source format](./03-source-format.md).

## Diagnostics

These source problems do not stop the entire document:

- a marked document without `---` displays everything after the marker as body content;
- a field line without `=` is skipped;
- a definition with an invalid variable name is skipped;
- the first of duplicate variable definitions is used; and
- empty dropdown entries are discarded while valid entries remain.

While the generated form and document remain visible, the toolbar displays a **Diagnostics**
button with the current count. Its dialog lists every localized diagnostic message, line number,
and relevant source line. The count and list update when diagnostics change.

Diagnostics describe the opened document. They are visually and semantically distinct from app
notifications about file reads or exports through a dedicated button and dialog, colors, and
explanatory text. Information does not rely on the `title` attribute alone. An unmarked file is
a valid ordinary document and has no marker diagnostic.

Only a failure to read the file prevents switching documents, in which case the app asks the
reader to select it again.

## Exporting rendered output

With a document open, **Export output** downloads the currently displayed content. For a
Docfilly document, it exports only the body after applying current form values. It omits the
`#!docfilly` header, field definitions, and processed conditional directives. Ordinary
Markdown and text are exported unchanged.

The original filename becomes `<name>-output.md` for Markdown or `<name>-output.txt` for text.
The respective MIME types are `text/markdown;charset=utf-8` and
`text/plain;charset=utf-8`. Downloads use browser `Blob` and object URLs.

Export creates a separate file and never overwrites the original. It differs from **Save as
Docfilly**, which retains the header and saves form defaults. A failed export leaves the current
document and values on screen.

## Saving Docfilly source

For a Docfilly document, **Save as Docfilly** downloads source with the current form values as
new defaults. Header comments, labels, variable order, body placeholders, and conditional
directives remain, so reopening the result creates another form. The action is disabled for
ordinary Markdown and text.

The original filename and its `.md`, `.markdown`, or `.txt` extension are retained. The
browser's Blob download does not overwrite the original local file; handling of a duplicate
download name follows browser settings. Generation or download failure leaves the visible
document and values intact.

## Interface and theming

The web app imports the opt-in `docfilly/styles.css` stylesheet and selects its palette with
`data-docfilly-theme`. App CSS overrides only `--docfilly-sticky-top` and
`--docfilly-form-max-height` for the toolbar. In a side-by-side layout, the form column's
background and divider continue below a short sticky form. Reusing core styles for the form,
controls, body, Markdown, and palettes prevents the demo and public CSS from diverging.

The toolbar contains the app name, filename, open, save-as-Docfilly, export, close, diagnostics,
settings, and help actions. Close is disabled without a document. On narrow screens, lower
priority actions including Settings move into an accessible, named vertical-ellipsis menu. The
menu closes after an action, an outside click or tap, or Escape. Escape returns focus to the
ellipsis button. The form and output appear side by side when the `.docfilly` container—not the
viewport—is at least 47.5rem wide, and stack below that width.

## Display language

App UI, notifications, Help, ARIA labels, and built-in samples support English (`en`) and
Japanese (`ja`). With no saved preference, the initial locale is the first supported entry in
`navigator.languages`, then `navigator.language`, and finally English. Tags such as `en-US`
and `ja-JP` normalize to their base language; unsupported tags fall back to English.

The named Settings dialog has **Display**, **Document**, and **Data and privacy** sections. Under
Display, readers can choose **Use browser settings**, **日本語**, or **English**. The choice is
persisted in versioned user preferences for the current browser profile. With no saved choice,
or with browser settings selected, the browser resolution above applies.

Changing the locale updates `<html lang>`, all app UI, and the explicit locale passed to core,
so diagnostics switch language too. An already-open document—including a built-in sample—keeps
its source and current form values. Opening a sample afterward selects the current locale's
sample. User-provided document bodies, labels, options, and values are never translated.

Display also offers **Use system settings**, **Light**, and **Dark** themes. The system setting is
the default and follows changes to `prefers-color-scheme`; explicit selections are stored with
the language preference. An early script in `<head>` resolves the saved or system theme before
React starts and applies `data-theme`, `color-scheme`, and the page's `theme-color` metadata
to avoid a reload flash. A web app manifest cannot follow runtime preferences, so its
`theme_color` and `background_color` retain fixed light-theme fallbacks. Dynamic page
metadata takes over after loading.

`apps/web/src/locale.ts` uses a shared TypeScript type to verify UI resource keys and
interpolation values. `apps/web/src/samples/en.md` and `ja.md` are bundled through Vite raw
imports and require no runtime fetch. See [the web app README](../apps/web/README.md) for English
implementation and language-extension instructions.

## Help and keyboard behavior

Help begins with **What is Docfilly?** and explains how Docfilly replaces repeated mental
substitution with one initial form. Authors put fields and conditional content in the source;
readers see that form and their customized body. Ordinary Markdown and text remain supported.

It then covers file selection and drag and drop, generated forms, the two save operations, local
storage, and privacy. The privacy section explains that open files and entered values stay in
the browser, and that the app can be installed for offline use. Help links to the
[Source format](./03-source-format.md) and can open the sample. Detailed storage and deletion
controls live under **Data and privacy** in Settings.

Settings, Help, and Diagnostics are named modal dialogs. Opening one moves focus to its heading,
and Tab cycles within it. A data-deletion confirmation initially focuses the safe **Cancel**
action. Escape, Cancel, or Close returns focus to the control that opened the dialog.

## Components

- `App`: owns the current document, filename, read result, and status.
- `FileDropZone`: handles keyboard-accessible selection, window-wide drop behavior, and
  multiple-file validation.
- `DocumentViewer`: connects `DocfillyView` to app-specific status.
- `AppDialog`: provides shared focus and keyboard behavior for Settings, Help, and Diagnostics.
- `document-format`: typed definitions for accepted extensions, output extensions, and MIME
  types.
- `document-file`: extension-based type detection and File API reading.
- `document-export`: Docfilly source and output Blobs, MIME types, filenames, and browser
  downloads.
- `document-session`: IndexedDB persistence, validation, restoration, and deletion.
- `PwaUpdatePrompt`: service-worker update detection and reload-to-update behavior.
