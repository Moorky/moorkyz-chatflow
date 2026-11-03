# Main-branch history integration audit

- **UTC timestamp:** 2026-11-03T04:33:37Z.
- **Request:** Preserve the existing ChatFlow application history and the README-only remote default-branch history in a local `main` branch, then audit the exact tree before publication.
- **Acceptance:** Both histories remain reachable without force-pushing or rewriting; the resulting tree is the audited application tree; documented checks pass; no private conversation exports or credentials are added.
- **Review type:** Focused self-audit of branch ancestry, README differences, test results, dependency audit, and privacy boundary.

## Branch comparison

The source branch was `master` at `1db2d49389fbd123432edd0ff0a8c38823189240`. The remote default `master` was `6956b957796d4f357a00e840cba23a1be322dd36`, with one tracked file (`README.md`) and no merge base with the application history. The remote recovery ref `recovery/verified-20261103` pointed to the application commit. A fresh `git ls-remote` confirmed both remote tips during this audit.

The existing local `main` merge commit is `b0f707b2140eaf26bcff8c1764c478aca62a73b8`; its parents are the application commit and the remote README commit. `git diff --exit-code master main` passed, so the resulting file tree matches the application commit exactly. The older remote README described a retired local web app, linked to paths absent from its own one-file tree, and predates the current Chromium extension. The current [README](../README.md) supersedes those claims; the original remote commit and its README remain reachable as the merge's second parent. No remote ref was changed during this audit.

## Verification

All checks ran in a disposable detached worktree at the exact `main` commit. The repository's ignored `dist`, `artifacts`, `coverage`, and `test-results` in the owner's checkout were preserved. Gate commands are documented in the [testing guide](../docs/TESTING.md), [package scripts](../package.json), and [CI workflow](../.github/workflows/ci.yml).

| Check                         | Result                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime                       | Node.js 22.18.0 and npm 11.5.2; the package supports Node `>=22.18.0`. CI uses Node 24, so its remote run remains pending.                                                                                                                                                                           |
| `npm ci`                      | PASS; 172 packages installed. NPM reported development advisories, audited separately below.                                                                                                                                                                                                         |
| `npm run test:all`            | PASS: typecheck, lint, formatting, coverage, production build/package, and Playwright E2E. 191 unit/integration tests across 11 files passed; 21/21 browser tests passed. Coverage: 97.54% statements, 95.64% branches, 98.34% functions, and 98.62% lines.                                          |
| Package                       | PASS; deterministic unsigned MV3 ZIP with 11 files, 32,690 bytes; SHA-256 `ae50f6bf4d61160b7886a812021365dd114f218abd6246de15a63ddd20319cda`.                                                                                                                                                        |
| `npm audit --json`            | 11 moderate development-dependency findings; zero high/critical. The reported automatic fix would downgrade ESLint to 4.0.0, so no dependency change was made in this branch-integration task.                                                                                                       |
| `npm audit --omit=dev --json` | PASS; zero production vulnerabilities.                                                                                                                                                                                                                                                               |
| Source privacy                | The merge adds no source or data. The existing [publication audit](./2026-11-03-publication-audit.md) records a selected credential scan over the current source and 78 outgoing blobs. Tests use synthetic data; no real export, browser profile, credential, or live-account action was used here. |

## Limits and next step

This verifies the local integration tree, not GitHub CI, Chrome Web Store approval, real-account behavior, or broad assistive-technology certification. The remote default remains `master`; no `main` ref exists there. A normal fast-forward update of the existing default branch can be attempted after this audit is committed. No deployment job exists in the inspected CI workflow; pushes trigger its Windows/Linux verification matrix.

The README and this audit are task-owned documentation changes. The final audit formatting/reference sweep and the focused commit SHA are recorded in the handoff after those gates complete; this record does not guess its own commit hash.

**Post-audit reference sweep:** After saving this audit, all eight local links in the changed README/audit paths were path-checked (0 missing). `npm run format:check`, `npx prettier --check .audits/2026-11-03-main-branch-integration.md`, and `git diff --check` passed. No external URL is changed by this task.

**Commit SHA:** Not stated here because this audit is included in that commit; record the actual hash in the portfolio ledger and task handoff. No push has occurred yet.
