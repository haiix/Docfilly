# Repository Guidelines

## Project Structure & Module Organization

Docfilly is a pnpm TypeScript monorepo. `packages/docfilly/` contains the framework-independent parser, renderer, diagnostics, and tests. `packages/react/` provides the React adapter. `apps/web/` is the Vite demo: UI code is in `src/`, static assets in `public/`, Vitest tests in `tests/`, and Playwright scenarios in `e2e/`. Documentation belongs in `documents/`; brand sources and generated icons live under `brand/`.

## Build, Test, and Development Commands

Use Node 24 and pnpm 11 from the repository root. Run `pnpm install` for local setup and
`pnpm dev` for the Vite demo. Before opening a PR, run `pnpm lint`, `pnpm format:check`,
`pnpm version:check`, `pnpm test`, `pnpm typecheck`, and `pnpm build`. Run `pnpm test:e2e`
for user-visible web flows. See [Development and testing](documents/06-development-and-testing.md)
for command details, watch mode, and Playwright setup.

## Coding Style & Naming Conventions

TypeScript is strict, with unused declarations and switch fallthrough rejected. Use two-space indentation, double quotes, semicolons, and Prettier's 100-column limit with LF endings. Run `pnpm format` and `pnpm lint:fix` for cleanup. Use `PascalCase` for React components and types, `camelCase` for functions and variables, and kebab-case filenames for non-component modules (for example, `document-export.ts`). Keep public exports explicit in `src/index.ts`.

## Testing Guidelines

Use Vitest with jsdom for unit, parser, and React behavior tests; use React Testing Library for UI interactions. Name unit tests `*.test.ts` or `*.test.tsx`, and Playwright tests `*.spec.ts`. Add regression coverage beside the affected package and exercise user-visible flows in `apps/web/e2e/`. There is no fixed coverage threshold; test new behavior and edge cases.

## Commit & Pull Request Guidelines

Treat [CONTRIBUTING.md](CONTRIBUTING.md) as the source of truth for branches, releases, and PRs. Use Conventional Commit titles such as `feat(web): add export option`; add `!` for breaking changes and document migration steps. Complete the PR template, link the issue, and include screenshots for visible UI changes. Normal PRs must not edit version files or `CHANGELOG.md`.

## Security & Configuration

Do not commit secrets or generated files excluded by `.gitignore`. Follow [SECURITY.md](SECURITY.md) for vulnerability reports; never disclose them in a public issue.
