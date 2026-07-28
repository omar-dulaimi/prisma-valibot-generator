# CI/CD Workflows

This repository uses GitHub Actions for automated testing, building, and releasing. Here's an overview of the workflows:

## Core Workflows

### 1. CI (`ci.yml`)
**Trigger**: Push/PR to master branch

**Jobs**:
- **filter**: Decides whether the rest of the run is worth doing. It skips when a push or PR touches
  only documentation and carries no `feat`/`fix`/`perf`/`revert`/`refactor`/`test`/`build`/`ci` commit
  and no `BREAKING CHANGE`. Both jobs below depend on it, so a docs-only push shows CI as skipped.
- **test**: Runs on Node.js 22.x and 24.x
  - Builds project with `npm run gen-example`
  - Type checking with `npm run test:type-check`
  - Linting with `npm run lint` (`continue-on-error`, so lint cannot fail the job)
  - Tests with `npm run ci:test`
- **package-test**: Checks the artifact users receive, on Node.js 22.x
  - `npm run test:packed`: builds, runs `package.sh`, packs the tarball, installs it into an empty
    directory, runs `prisma generate`, and type-checks the generated output under `bundler`, `node10`,
    `node16` and `nodenext`, in both CommonJS and ESM
  - Uploads `package/` as a build artifact

Note that the unit tests import the generator from `src/` and load the generated barrel with
`await import('.../index.ts')`, which the Vitest loader resolves regardless of what `tsc` would say.
`package-test` is the only job that exercises the published package, which is why it exists.

### 2. Semantic Release (`semantic-release.yml`)
**Trigger**: Push to master branch, or manual `workflow_dispatch` (no inputs; the version bump comes
from the commits, not from a chosen release type)

**Features**:
- Uses conventional commits for automated releases
- Generates changelogs automatically
- Creates GitHub releases with release notes
- Runs the same `npm run test:packed` gate before publishing, so a release cannot ship generated output
  that fails to compile
- Publishes to npm from the `package/` directory

## Configuration Files

### Semantic Release (`.releaserc.json`)
- Conventional commits configuration
- Automatic changelog generation
- Branch-based release strategy (master = stable releases)
- npm publishing from `package/` directory
- `repositoryUrl` is set explicitly. package.json uses npm's `git+https://` form, which
  @semantic-release/github parses into an empty `$owner`; its `fail` step then dies on a GraphQL error
  that masks whatever actually went wrong.

## Authentication

Publishing uses npm **Trusted Publishing** (OIDC). There is no npm token, and adding one would break it.

The npm account has "Require two-factor authentication and disallow tokens" enabled, so token-based
automation cannot publish at all. Instead, `@semantic-release/npm` requests a short-lived OIDC token from
GitHub and exchanges it with the registry. Four things make that work, and each is load-bearing:

- `id-token: write` on the release job, without which there is no token to exchange
- Node 24, because the exchange needs npm 11.5.1 or newer
- `@semantic-release/npm` 13 or newer, the first version with OIDC support
- no `registry-url` on `actions/setup-node` and no `NPM_TOKEN` in the release step, since either one writes
  an `.npmrc` that conflicts with the exchange

### Required secrets
- `GITHUB_TOKEN`: automatically provided by GitHub

That is the complete list. Nothing else needs configuring in the repository.

### One-time setup on npmjs.com
A Trusted Publisher must be registered for this package before the first release: package page, Settings,
Trusted Publisher, GitHub Actions, then this repository and the workflow filename, leaving the Environment
field **blank** (the release job declares no `environment:`, so filling it in makes the OIDC claim mismatch).

Until that exists, a release fails with `ENONPMTOKEN` at `verifyConditions`. That failure is safe: it
happens before anything is tagged or version-bumped, so registering the publisher and re-running the
workflow publishes cleanly with no cleanup.

### Branch protection
- Enable branch protection for `master`
- Require status checks: "test", "package-test"
- Require up-to-date branches

## Commit Message Format

Use conventional commits for automatic release management:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types**:
- `feat`: New features (minor version)
- `fix`: Bug fixes (patch version)
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring (patch version)
- `perf`: Performance improvements (patch version)
- `test`: Test changes
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

**Breaking Changes**:
Add `BREAKING CHANGE:` in footer or `!` after type for major version bumps.

**Examples**:
```
feat: add MongoDB native type support
fix: resolve schema generation for optional fields
docs: update installation instructions
feat!: change API for schema configuration
```

## Manual Release

To trigger a manual release:

1. Go to Actions → Semantic Release
2. Click "Run workflow"
3. Click "Run workflow"

The workflow takes no inputs. semantic-release derives the version from the commits since the last tag,
so there is no release type to choose; if no releasable commit is present, the run publishes nothing.

## Testing Locally

```bash
# Build the generator and regenerate prisma/generated from prisma/schema.prisma
npm run gen-example

# Run the test suite
npm test

# Check the packed artifact: pack, install into an empty dir, generate, type-check the output
npm run test:packed

# Test release process (dry run)
npm run release:dry

# Type check
npm run test:type-check

# Lint code
npm run lint
```

## Monitoring

- **GitHub Actions**: View workflow runs in the Actions tab
- **NPM**: Monitor package downloads and versions

## Troubleshooting

### Common Issues

1. **Tests failing on Windows**: 
   - Check file path separators
   - Verify line ending settings

2. **Release workflow fails**:
   - `ENONPMTOKEN` at verifyConditions means no Trusted Publisher is registered for this package on
     npmjs.com yet. Nothing was tagged or published, so register it and re-run.
   - `Have you granted the id-token: write permission` means the release job lost that permission.
   - Check conventional commit format, and that a releasable commit type is present.
   - Ensure all tests pass; the release job is gated on CI.

3. **`npm run test:packed` fails**:
   - It reports the exact import specifier and the `tsc` errors it produced. Generated files are
     TypeScript sources the consumer compiles, so relative specifiers must end in `.js`: that resolves
     to the sibling `.ts` under `bundler`, `node10`, `node16` and `nodenext`, in CommonJS and ESM,
     with no compiler flag. `.ts` needs `allowImportingTsExtensions` (which forbids emit) and
     extensionless breaks under `node16`/`nodenext` ESM.
   - It installs from a real tarball, so it needs network access.

### Getting Help

- Review workflow logs in GitHub Actions
- Check the project's issue tracker
- Verify all required secrets are configured
- Test changes in a fork first