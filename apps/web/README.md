# Docfilly web viewer

The web viewer opens local `.md`, `.markdown`, and `.txt` documents entirely in the browser. It does not translate user-authored document content, form labels, choices, or values.

## Locales

The app-owned interface and built-in tutorial support English (`en`) and Japanese (`ja`). On startup, the viewer checks `navigator.languages` in order, then `navigator.language`, and falls back to English when none of those values is supported. Region variants such as `en-US` and `ja-JP` resolve to their base language.

Readers can switch languages with the toolbar language selector. The choice lasts for the current page session and is not persisted. Changing it updates `<html lang>`, all app-owned labels and messages, the built-in sample, and the locale passed to Docfilly Core for diagnostics.

Locale catalogs live in `src/locale.ts`. Their shared TypeScript interface keeps keys and interpolation functions consistent. Built-in tutorials live in `src/samples/en.md` and `src/samples/ja.md`; Vite imports both as raw static assets, so no runtime fetch is required.

To add a language, extend the supported locale type in Core, add a complete typed web catalog and sample document, expose it in the selector, and cover locale resolution, UI text, sample behavior, and localized Core diagnostics in unit and browser tests.
