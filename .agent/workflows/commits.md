---
description: How to use Conventional Commits for automated versioning
---

# Conventional Commits Guide

FlowRead uses `standard-version` to automate version numbers and changelogs. For this to work, you must prefix your commit messages correctly.

## Commit Types

| Prefix | Meaning | SemVer Bump |
| :--- | :--- | :--- |
| `feat:` | A new feature | **Minor** (`0.1.0`) |
| `fix:` | A bug fix | **Patch** (`0.0.1`) |
| `chore:` | Maintenance (no code change) | None (unless specified) |
| `docs:` | Documentation changes | None |
| `style:` | Formatting, missing semi-colons, etc. | None |
| `refactor:` | Refactoring code | None |
| `perf:` | Performance improvements | Patch |

## Examples

- **Feature**: `feat: add support for epub files`
- **Bug Fix**: `fix: resolve crash on large pdf uploads`
- **Maintenance**: `chore: update dependencies`
- **Breaking Change**: 
  Add `!` after the type or "BREAKING CHANGE" in the footer.
  `feat!: change core ai provider architecture` (Triggers **Major** bump)

## How to Release

When you are ready to publish a new version:

1. Ensure everything is committed.
2. Run `npm run release`.
3. This will update `package.json`, generate `CHANGELOG.md`, and create a Git tag.
4. Finally, run `git push --follow-tags`.
