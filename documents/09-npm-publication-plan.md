# npm publication plan

This document defines the preparation and procedure for publishing `docfilly` and
`@docfilly/react` to npm in the future. Publication is not enabled today. Review this plan when
the publication policy is finalized.

## Decisions required before publication

1. Confirm that the `docfilly` package name is available on npm.
2. Select the npm organization and administrators for `@docfilly/react`.
3. Finalize supported Node.js, browser, and React versions as part of the public API policy.
4. Define npm dist-tag usage: `latest` for stable releases and `next` for prereleases.
5. Assign maintainers with publication access and define account-loss recovery.

## Package metadata

Before publication, configure and verify at least these fields in each package manifest:

- `description`
- `license`
- `repository`
- `homepage`
- `bugs`
- `keywords`
- `engines`
- `publishConfig.access`

Build each package with `pnpm pack`. Confirm that its tarball contains `dist`, README, and
LICENSE, and excludes source, tests, secrets, and unnecessary configuration.

## Authentication and supply chain

Use npm Trusted Publishing with GitHub Actions OIDC rather than storing a long-lived token in
GitHub Secrets. The publication workflow must:

- register this repository, the publication workflow name, the environment, and permitted
  `npm publish` operation as the Trusted Publisher for each package;
- start from a GitHub Release or a protected manual environment approval;
- use only `contents: read` and `id-token: write` as its baseline permissions;
- use npm CLI 11.5.1 or later and verify automatic provenance generation through Trusted
  Publishing;
- pin every Action to a complete commit SHA; and
- verify that the publication tag, `version.txt`, and all package versions match.

## Prepublication checks

In addition to regular CI, the publication job must:

1. Run `pnpm install --frozen-lockfile`.
2. Run `pnpm lint`.
3. Run `pnpm format:check`.
4. Run `pnpm version:check`.
5. Run `pnpm test`.
6. Run `pnpm typecheck`.
7. Run `pnpm build`.
8. Install the tarballs produced by `pnpm pack` in a temporary project.
9. Smoke-test ESM `import`, CommonJS `require`, and TypeScript type resolution.
10. Confirm that the React package resolves the published core package.

## Publication order

After verifying conversion of workspace dependencies to publication versions, publish in this
order:

1. `docfilly`
2. `@docfilly/react`

Run both steps in the same approved workflow to minimize the interval with only one package
published. Do not publish React if core publication fails.

## Post-release checks

1. Verify the npm version, dist-tag, and provenance.
2. Install both packages from the registry into an empty temporary project.
3. Run minimal ESM, CommonJS, and React examples.
4. Verify that the GitHub Release and CHANGELOG link to the npm packages.

Do not delete a published version. If it has a problem, use `npm deprecate` to explain the
impact and replacement version, then publish the fix as a new version.
