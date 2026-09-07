# Development and testing

Changes must preserve Docfilly's core experience: moving the reader's repeated substitutions
into an initial form. When adding syntax or interface behavior, ask whether readers can continue
to focus on the document without learning that syntax.

English is the canonical language for project documentation. Update the relevant English files
under `documents/` whenever behavior, APIs, or development practices change.

## Requirements

- Node.js 24
- pnpm 11

`.node-version` defines the Node.js major version and the root `package.json` `engines` field
defines the supported range. Apply `.node-version` on entering the repository if your version
manager supports it. Use the pnpm version pinned by `packageManager`.

## Root commands

Run all commands from the repository root.

```sh
pnpm install
```

Installs dependencies for every workspace.

```sh
pnpm dev
```

Starts the web app's Vite development server.

```sh
pnpm build
```

Builds the libraries and web app.

```sh
pnpm typecheck
```

Runs TypeScript type checking across the workspace.

```sh
pnpm lint
```

Checks JavaScript and TypeScript with ESLint. Use `pnpm lint:fix` for automatically fixable
problems.

```sh
pnpm format
```

Formats supported files with Prettier. Use `pnpm format:check` to verify formatting without
changing files.

```sh
pnpm test
```

Runs the Vitest suites once.

```sh
pnpm test:watch
```

Starts Vitest in watch mode.

```sh
pnpm version:check
```

Verifies that `version.txt` and all workspace versions match.

```sh
pnpm test:e2e
```

Runs the web app's Playwright suite. Install Chromium before the first run:

```sh
pnpm --filter @docfilly/web exec playwright install chromium
```

## Library build

`packages/docfilly` builds in this order:

1. Vite produces ES Modules and CommonJS.
2. TypeScript produces declarations.

Output is written to `packages/docfilly/dist`:

```text
dist/
├─ docfilly.js
├─ docfilly.cjs
└─ index.d.ts
```

## Test environment

- Runner: Vitest
- DOM implementation: jsdom
- Core configuration: `packages/docfilly/vitest.config.ts`
- Parser tests: `packages/docfilly/tests/parser.test.ts`
- DOM rendering tests: `packages/docfilly/tests/docfilly.test.ts`
- Web configuration: `apps/web/vitest.config.ts`
- Web tests: `apps/web/tests/`
- Web UI tests: React Testing Library

jsdom verifies form elements, events, and Markdown output without launching a browser.

## Browser end-to-end tests

Playwright starts the `apps/web` Vite server with the same `/Docfilly/` base path as GitHub
Pages. It reuses an existing server locally and uses one worker in CI. Failed-run screenshots
and traces go to `apps/web/test-results`; the HTML report goes to
`apps/web/playwright-report`.

Add user scenarios under `apps/web/e2e`. Prefer roles, labels, and visible text over CSS classes
or DOM structure. Use locators and web-first assertions rather than fixed delays. Keep tests
independent, and cover small logic branches, component branches, and boundaries with Vitest.

## Current coverage

### Parser

- Text fields, dropdowns, and checkboxes
- Omitted labels
- CRLF and UTF-8 BOM
- Lowercase `[x]` and uppercase `[X]` as initially on
- `[True]` and `[False]` as dropdown options
- Non-ASCII variable names, including Japanese
- `#!docfilly` recognition with case and surrounding-whitespace tolerance
- Ordinary handling of unmarked source, including an unrecognized `---`
- Separator lines with surrounding whitespace
- Blank lines around the separator not affecting parsing or diagnostics
- Preservation of a blank first body line after the separator
- Fallback when a marked document has no separator
- Skipping lines without `=` and definitions with invalid names
- First-definition-wins handling of duplicate names
- Empty dropdown-option removal and text-field fallback
- CSV-style quoting for labels, text values, and dropdown options
- Quoted type-like notation treated as text
- Invalid-quoting recovery and diagnostics
- Conditional syntax trees, nesting, and source-preserving invalid-syntax recovery

### Document evaluation

- Markdown and plain-text output source after template evaluation
- Variable-value escaping and HTML sanitization for Markdown
- Plain-text fallback after Markdown conversion failure
- Combination of parse diagnostics with diagnostics from the latest render

### DOM integration

- Form element creation and initial Markdown rendering
- Current value access and delayed rendering after input
- Preservation of undefined placeholders
- Six case transformations and filter chaining
- Diagnostics for unknown filters and invalid placeholders
- Hiding the form when no fields or instructions exist
- Applying document-evaluation results to the DOM
- `docfilly:render` events and `destroy()` cleanup
- Checkbox conditions and `#else` rerendering
- `=` and `!=` comparisons for text and dropdowns, including CSV-style quoting
- Nested blocks, the 32-level limit, and escaping
- Source preservation and line-numbered diagnostics for invalid blocks
- No reinterpretation of user values as directives

### Web app

- Type detection for `.md`, `.markdown`, and `.txt`
- Rejection of unsupported formats
- Drop overlay while dragging
- Single-file acceptance and multiple-file rejection
- React integration for samples and local files
- Form-value preservation and prevention of duplicate DOM on React rerender
- Ordinary-document state and diagnostics received through the React adapter

The web unit suite additionally covers localization, preferences, persistence, dialogs, export,
data reset, and the PWA update prompt. Playwright covers user-visible flows, the production PWA
manifest and service worker, and offline startup.

## Before submitting a change

```sh
pnpm lint
pnpm format:check
pnpm version:check
pnpm test
pnpm typecheck
pnpm build
```

Run `pnpm test:e2e` for user-visible web flows. If format syntax or a public API changes, update
its documentation together with its tests.

For documentation and UI changes, also verify that:

- readers can operate the result without learning internal syntax;
- one initial value applies throughout the body instead of requiring repeated substitution;
- authors need only a small addition to ordinary Markdown or text;
- source remains understandable without Docfilly where possible; and
- diagnostics help authors without blocking readers.

## Continuous integration

`.github/workflows/ci.yml` runs for pull requests, pushes to `main`, and manual dispatch.

CI uses Node.js 24 and the pnpm version pinned in `package.json`, then runs:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm format:check`
4. `pnpm version:check`
5. `pnpm test`
6. `pnpm typecheck`
7. `pnpm build`

A separate E2E job installs Chromium and runs `pnpm test:e2e`. On failure, reports and test
artifacts are uploaded to GitHub Actions.

On `main`, CI calls the reusable `.github/workflows/deploy-pages.yml` workflow only after the
regular and E2E jobs both succeed. Pages cannot be dispatched directly; manual redeployment also
runs through CI.

Third-party GitHub Actions are pinned to complete commit SHAs, with the matching release tag in
a trailing comment. Dependabot pull requests update Actions. To update a tag target manually,
verify its commit through the GitHub API endpoint
`repos/{owner}/{repo}/git/ref/tags/{tag}`. For an annotated tag, follow the returned tag object
through `repos/{owner}/{repo}/git/tags/{sha}` to the final commit.

A newer run on the same branch cancels the older run.

## Adding tests

- Test syntax-only behavior directly with `parseDocfillySource`.
- Test forms and rendering with `createDocfilly` under jsdom.
- Use `vi.useFakeTimers()` for timer-dependent behavior.
- Add a regression test for every security fix.
