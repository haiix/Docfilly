# Repository Guidelines

## Project Structure & Module Organization

Docfilly is a pnpm TypeScript monorepo. `packages/docfilly/` contains the framework-independent parser, renderer, diagnostics, and tests. `packages/react/` provides the React adapter. `apps/web/` is the Vite demo: UI code is in `src/`, static assets in `public/`, Vitest tests in `tests/`, and Playwright scenarios in `e2e/`. Documentation belongs in `documents/`; brand sources and generated icons live under `brand/`.

## Build, Test, and Development Commands

Run commands from the repository root using Node 24 and pnpm 11.

- `pnpm install --frozen-lockfile` installs the workspace exactly as locked.
- `pnpm dev` starts the web app's Vite development server.
- `pnpm build` builds all packages and the demo.
- `pnpm test` runs all Vitest suites once; `pnpm test:watch` watches them.
- `pnpm test:e2e` runs the web Playwright suite (Chromium must be installed).
- `pnpm lint`, `pnpm format:check`, and `pnpm typecheck` reproduce CI quality checks.
- `pnpm version:check` verifies that workspace versions match `version.txt`.

## Coding Style & Naming Conventions

TypeScript is strict, with unused declarations and switch fallthrough rejected. Use two-space indentation, double quotes, semicolons, and Prettier's 100-column limit with LF endings. Run `pnpm format` and `pnpm lint:fix` for cleanup. Use `PascalCase` for React components and types, `camelCase` for functions and variables, and kebab-case filenames for non-component modules (for example, `document-export.ts`). Keep public exports explicit in `src/index.ts`.

## Testing Guidelines

Use Vitest with jsdom for unit, parser, and React behavior tests; use React Testing Library for UI interactions. Name unit tests `*.test.ts(x)` and Playwright tests `*.spec.ts`. Add regression coverage beside the affected package and exercise user-visible flows in `apps/web/e2e/`. There is no fixed coverage threshold; test new behavior and edge cases.

## Commit & Pull Request Guidelines

Work issue-by-issue and merge through reviewed, passing pull requests. Use Conventional Commit titles such as `feat(web): add export option` or `fix(core): preserve quoted values`; add `!` for breaking changes and document migration steps. Complete the PR template with a concise rationale, release impact, tests, and documentation changes; include screenshots for visible UI changes and link the relevant issue. Normal PRs must not edit `version.txt`, package versions, or `CHANGELOG.md`; Release Please owns those updates.

## Security & Configuration

Do not commit secrets or generated `dist/`, coverage, Playwright report, or test-result directories. Report vulnerabilities through the process in `SECURITY.md`, not a public issue.
