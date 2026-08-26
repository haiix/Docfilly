# Docfilly web viewer

The web viewer opens local `.md`, `.markdown`, and `.txt` documents entirely in the browser. It does not translate user-authored document content, form labels, choices, or values.

## Locales

The app-owned interface and built-in tutorial support English (`en`) and Japanese (`ja`). On startup, the viewer checks `navigator.languages` in order, then `navigator.language`, and falls back to English when none of those values is supported. Region variants such as `en-US` and `ja-JP` resolve to their base language.

Readers can switch languages with the toolbar language selector. The choice lasts for the current page session and is not persisted. Changing it updates `<html lang>`, all app-owned labels and messages, and the locale passed to Docfilly Core for diagnostics. An already opened document—including a built-in sample—keeps its source and current form values. Opening a sample afterward selects the sample for the current locale.

Locale catalogs live in `src/locale.ts`. Their shared TypeScript interface keeps keys and interpolation functions consistent. Built-in tutorials live in `src/samples/en.md` and `src/samples/ja.md`; Vite imports both as raw static assets, so no runtime fetch is required.

To add a language, extend the supported locale type in Core, add a complete typed web catalog and sample document, expose it in the selector, and cover locale resolution, UI text, sample behavior, and localized Core diagnostics in unit and browser tests.

## PWA and offline use

The production build uses `vite-plugin-pwa` to generate a web app manifest and a Workbox service worker under the `/Docfilly/` GitHub Pages base path. After the viewer has loaded online once, supported browsers can install it and reopen the cached app shell offline. The app-owned English and Japanese catalogs and tutorials are static imports, so both locales remain available without runtime network requests.

Only build assets such as HTML, JavaScript, CSS, icons, and the generated manifest are precached. Local documents are never sent to the service worker or stored in Cache Storage. The latest document and form values remain isolated in IndexedDB for session restoration. Closing a document removes its recovery data. **Reset app data** in Help additionally closes the document, deletes Docfilly's Workbox caches, and unregisters the `/Docfilly/` service worker without uninstalling the installed app or deleting original and downloaded files. The current page is not reloaded; the next visit requires a network connection and recreates the offline assets.

When a new deployment produces a waiting service worker, the viewer offers localized actions to reload and update or continue with the current version. Activating the update removes obsolete Workbox caches. Run `pnpm --filter @docfilly/web test:e2e` to build the production app and verify its manifest, service worker scope, offline startup, bundled locales, sample, and local-file flow.
