# Diagnostic localization

Docfilly diagnostics are available in English (`en`) and Japanese (`ja`). Diagnostic `code` values remain stable across locales; only the human-readable `message` changes. Existing consumers can continue to display `diagnostic.message` directly.

## Public API

Pass `locale` to any Core entry point that can produce diagnostics:

```ts
import { createDocfilly, parseDocfillySource, updateDocfillyDefaults } from "docfilly";

const parsed = parseDocfillySource(source, { locale: "ja" });
const view = createDocfilly(source, "md", { locale: "ja-JP" });
const updated = updateDocfillyDefaults(source, view.values, { locale: "ja" });
```

The React wrapper forwards the same option:

```tsx
<DocfillyView source={source} sourceType="md" options={{ locale: "ja" }} />
```

`SupportedLocale` is the normalized output type (`"en" | "ja"`). Inputs accept strings so callers can pass regional language tags such as `en-US` and `ja-JP`. `resolveLocale(locale?)` is exported for applications that need to use the same resolution behavior for their own UI.

## Resolution order

Locale resolution happens once when a function is called or a view instance is created:

1. An explicitly supplied `locale` is used when present.
2. Otherwise, `navigator.language` is used in a browser.
3. Regional tags are reduced to their base language (`ja-JP` to `ja`, `en-US` to `en`).
4. Missing or unsupported languages fall back to English.

An existing view does not automatically follow later browser-language changes. Create a new Core instance, or pass a new `options.locale` value to `DocfillyView`, to change its diagnostic language.

## Adding a language

1. Add the locale to `SupportedLocale` in `packages/docfilly/src/types.ts`.
2. Add a complete catalog in `packages/docfilly/src/messages.ts`. The `MessageCatalog` type requires every message key and gives each formatter its typed interpolation parameters.
3. Update `resolveLocale` to recognize the new base language.
4. Add the locale to the catalog-completeness, normalization, Core API, DOM integration, and React propagation tests.
5. Document the new locale and any default-message impact in the relevant user documentation. Do not edit `CHANGELOG.md` in a normal pull request; verify the generated entry in the Release Please pull request.

Translations should preserve Docfilly syntax, identifiers, source excerpts, and interpolated user values exactly. They should convey equivalent causes and recovery actions naturally rather than mirror another locale word for word.
