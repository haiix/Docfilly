# Contributing to Docfilly

English is the canonical language for project documentation. Keep `README.md`, this guide, and
the files under `documents/` in English when adding or changing documented behavior.

## Development workflow

Create a branch and pull request for each issue, then merge into `main` after CI and review.
Successful CI on `main` automatically updates the development app at `/Docfilly/dev/` on GitHub
Pages. The released app at `/Docfilly/stable/` is built from the latest published GitHub Release
tag. `/Docfilly/` redirects to the released app. Each deployment includes both apps.

Do not change `version.txt` or the `version` fields in package manifests in an ordinary pull
request. Version updates belong in the release pull request.

## Pull request titles and commits

Release Please determines the next version and release notes from Conventional Commits on
`main`. Pull requests are normally squash merged, so use this format for the pull request title:

```text
<type>(optional scope): <description>
```

The principal types are:

| Type                           | Use                                 | CHANGELOG     | Version effect |
| ------------------------------ | ----------------------------------- | ------------- | -------------- |
| `feat`                         | User-facing feature                 | Added         | minor          |
| `fix`                          | User-facing bug fix                 | Fixed         | patch          |
| `perf`                         | User-facing performance improvement | Performance   | patch          |
| `refactor`                     | User-facing structural change       | Changed       | none           |
| `docs`                         | User-facing documentation change    | Documentation | none           |
| `revert`                       | Reversal of a user-facing change    | Reverted      | patch          |
| `chore`, `test`, `ci`, `build` | Internal work                       | omitted       | none           |

Add `!` immediately after the type for a breaking change, and explain its impact and migration
steps in the commit or pull request body.

```text
feat!: change the template syntax
```

## Versioning policy

The project uses Semantic Versioning in the `0.x.y` range until it is stable.

- User-facing bug fixes increment the patch version (for example, `0.2.0` to `0.2.1`).
- New features, APIs, and syntax increment the minor version (for example, `0.2.1` to `0.3.0`).
- Breaking changes before 1.0 increment the minor version (for example, `0.3.0` to `0.4.0`).
- The project will reach `1.0.0` when its syntax, core API, and basic usage can be guaranteed as
  stable.

`version.txt` is the source of truth for the project version. During a release, automation
updates these files to the same version:

- `version.txt`
- `packages/docfilly/package.json`
- `packages/react/package.json`
- `apps/web/package.json` (the display version of the private app)

`pnpm version:check`, which also runs in CI, verifies that the versions match.

## Release workflow

1. After ordinary pull requests are merged into `main`, Release Please collects their changes
   at midnight Japan Standard Time each day and creates or updates a release pull request. The
   `Prepare release` workflow can also be run manually when needed.
2. Review the proposed version, `CHANGELOG.md`, and version files in the release pull request.
3. Merge the pull request when the collected changes are ready for release.
4. On the next scheduled run, or a manual `Prepare release` run, Release Please creates a tag
   such as `v0.1.0` and a GitHub Release. A subsequent job in the same workflow builds and deploys
   the released app alongside the latest successfully verified development app. This works even
   when Release Please uses `GITHUB_TOKEN`, without relying on a separate release event.
5. npm publication remains disabled until the publication policy is finalized.

Pages deployments are serialized. At build time, the deployment workflow resolves the latest
published release and the latest successful main CI run (or the verified calling CI commit if
newer). It checks out each source separately and installs from its own frozen lockfile. Deployment
configuration is copied into legacy released checkouts to support tags predating the split URLs;
application sources are kept at the release tag. Old releases gain the new path and PWA scope,
but gain the version display only once a release includes that feature. A published release and
a verified main commit must exist before deployment can succeed.

The next version is derived from changes merged since the previous tag. To select a version in
an exceptional case, add a footer such as `Release-As: 0.4.0` to the relevant commit body.

To let the standard `GITHUB_TOKEN` create the release pull request, enable **Allow GitHub Actions
to create and approve pull requests** under **Settings → Actions → General → Workflow
permissions**.

If that setting cannot be enabled, or if regular CI must run automatically on release pull
requests, register a dedicated token with pull request and contents write access as the
`RELEASE_PLEASE_TOKEN` Actions secret. The workflow uses that token when present and otherwise
uses `GITHUB_TOKEN`.

## CHANGELOG

`CHANGELOG.md` records released changes that affect users. Do not edit it directly in an
ordinary pull request. Review and adjust it only in the release pull request generated by
Release Please. Routine test, CI, and dependency updates without user-facing effects are not
included.
