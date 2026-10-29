# Offline test expansion and example verification

| Field      | Value                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| Audit ID   | `2026-10-29-test-expansion`                                                                             |
| Date (UTC) | 2026-10-29                                                                                              |
| Auditor    | Copilot SDK assistant in VS Code; implementation self-audit                                             |
| Baseline   | `c61d6bee58cf1fd9b6b71aec916554f2528a8ecc`                                                              |
| Scope      | Tests for implemented offline functionality, demonstrated regressions, local example, real-data harness |
| Outcome    | Public checks PASS; genuine historical-export validation NOT RUN because no export was supplied         |

## Analyzing and Reading

The owner requested all tests and a real example. Read the current README,
implementation contracts, importer, search, storage, worker, selection, statistics,
export code, existing tests, build configuration, and the previous cleanup audit.
The preceding audit/commit requirement remains applicable.

Initial working tree contained unrelated edits in five files: the earlier audit,
README, package manifest/lockfile, and extension manifest. These included product
version changes to 1.0.0 and three transitive lockfile metadata changes. Preserve
them rather than absorbing them into the test commit or resetting the worktree.
The existing preview on port 4173 (PID 39668) is not owned by this task.

Baseline `npm run verify` passed: 56 unit tests, strict types/lint/format, build
and package validation. No real historical export was present in the test
fixtures. A request for a local official export could not be answered because
the owner was unavailable. No private folders were searched for exports.

## Researching and Planning

- Cover the currently implemented behavior, not pretend that unimplemented V5
  features have tests or are ready for release.
- Add direct storage/worker tests, input/format/branch/Boolean matrices,
  distribution assertions, and full installed-extension examples.
- Add pinned test-only `@vitest/coverage-v8` 5.0.5 and `fake-indexeddb` 6.2.6,
  compatible with the existing Vitest and Node versions.
- Enforce at least 95% overall statements, branches, functions, and lines for
  non-UI TypeScript modules. UI behavior is separately tested in Chromium.
- Do not mislabel generated conversations as real historical data. Provide an
  explicitly authored example plus an explicit-input, local-only real-export
  runner without a synthetic fallback or silent skip.
- Public fixture discovery did not establish a suitably sourced real-data
  fixture. No downloaded conversation collection or third-party fixture was
  copied into this repository.
- Reuse a single temporary-profile MV3 fixture across installed-extension tests.
  Run browser previews on free ports, preserving the existing server.

## Developing

### Tests added

| Surface           | Added coverage                                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integrity         | Standard SHA-256 vectors, subarray boundaries, URL validation and explicit error text                                                                                                          |
| Import            | Invalid graphs/IDs, text-form content, attachment metadata, missing times, ZIP header/path/encoding/comment/segment cases                                                                      |
| Search            | Independent Boolean truth tables across 16 combinations in both scopes, title/body separation, role/date/case boundaries, literal punctuation and offset deduplication                         |
| Storage           | Persisted-field corruption matrix and actual IndexedDB transaction API through fake-indexeddb; replacement, abort rollback, open failures and recovery                                         |
| Worker            | Real worker logic with a mocked persistence boundary; progress, serialization, lifecycle, no-import errors, failed save/clear, invalid selection and oversized-input rejection                 |
| Statistics/export | Empty means/dates, every role, Unicode codepoints, every report/format/branch combination, immutable source, exact counts, checksums and fingerprints                                          |
| Browser           | Select beyond the first 40 rendered chats, deterministic N, role/case/date recovery, exact example hits, previous/next context, restore, alternate branches and every approved download format |
| Packaging         | Actual ZIP checksum, version agreement, CSP/permissions, local assets, icon signatures and complete bundled attribution                                                                        |

### Reproduced defects and fixes

1. **ZIP end-signature bytes inside a valid archive comment:** a regression
   containing an actual EOCD comment failed before the fix. Match the signature
   together with its comment-length boundary before accepting an EOCD candidate.
2. **Corrupted stored role/content-kind arrays accepted as strings:** two
   corruption cases failed before the fix. Validate the string type before
   checking its allowed value; no coercion inside the dataset type guard.
3. **Empty/unknown statistics selection accepted as a successful report:** worker
   regressions failed before the fix. Reuse a shared selection resolver for both
   statistics and exports, with explicit errors for invalid selections.

No product feature or dependency used in the runtime bundle was added.
The optional real-data runner does not bypass unsupported schemas or resource
budgets, and no account automation was enabled.

### Example provenance

`tests/fixtures/example-conversations.json` is authored synthetic data in the
official-export shape, not an actual downloaded account export. It has two chats,
six active messages, seven all-branch messages, and a regenerated answer.
The production-extension test asserts known message IDs, counts, source hashes,
full selected-chat export content, and restoration.

`playwright.real.config.ts` requires `CHATFLOW_REAL_EXPORT` to reference an
existing local file. Its dedicated test imports all branches in a fresh extension
profile, verifies every normalized message's ID/text fingerprint across export,
checks hashes/counts/restoration, then clears and removes its temporary profile.
The importer is shared with the product; the round-trip check is not independent
validation of all possible official raw schemas.

Private test traces/screenshots/video are disabled and its output is not retained.
No actual private export is committed, uploaded, or described as tested here.
Rehearsing this runner with the authored example validates its mechanics only.

## Clean Up

### Executed verification

Environment: Windows, Node v22.18.0, npm 11.5.2.

| Check                                                    | Result                      | Evidence                                                                                                                                                                                                                                                    |
| -------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline                                                 | PASS                        | `npm run verify`: 56 unit tests and existing build/tool checks before changes.                                                                                                                                                                              |
| Expanded complete public gate                            | PASS                        | `$env:CHATFLOW_TEST_PORT = '4177'; npm run test:all`: strict TypeScript, ESLint, Prettier, 191 unit/integration tests in 11 files, all coverage gates, production build and 21 browser/package tests. No skipped public tests.                              |
| Core coverage                                            | PASS                        | V8: statements 97.54% (596/611), branches 95.64% (505/528), functions 98.34% (119/121), lines 98.62% (502/509). UI excluded explicitly and covered by browser scenarios instead.                                                                            |
| Real-input requirement                                   | PASS, expected rejection    | `npm run test:real` without `CHATFLOW_REAL_EXPORT` exited nonzero with the explicit required-input error; no silent fallback.                                                                                                                               |
| Real-data harness rehearsal                              | PASS, authored fixture only | Set `CHATFLOW_REAL_EXPORT` to the checked-in authored example and ran `npm run test:real`: one local-file MV3 round-trip test passed. This is NOT a historical-export result.                                                                               |
| Genuine historical export                                | NOT RUN                     | No official account export supplied; owner unavailable to provide a path.                                                                                                                                                                                   |
| Dependency advisories                                    | PASS                        | `npm audit`: zero reported vulnerabilities, including development dependencies.                                                                                                                                                                             |
| Clean installation                                       | PASS                        | Copied current manifests to a task-owned session directory; `npm ci --ignore-scripts --prefix <isolated-directory>` installed and audited successfully without changing workspace dependencies or user data.                                                |
| Working-tree package                                     | PASS                        | Built `moorkyz-chatflow-1.0.0.zip`: 32,690 bytes, 11 files, SHA-256 `ae50f6bf4d61160b7886a812021365dd114f218abd6246de15a63ddd20319cda`. Version reflects the preserved pre-existing working-tree edit.                                                      |
| Focused staged snapshot                                  | PASS                        | Exported the exact index with `git checkout-index` into a task-owned directory; clean `npm ci --ignore-scripts`, `npm run test:all` on port 4179, and the explicitly synthetic local-file rehearsal all passed independently of the owner's unstaged edits. |
| Formatting/whitespace/references                         | PASS                        | Prettier, `git diff --cached --check`, focused runtime diff review, and filesystem checks of all local README/testing-guide links passed. Repeat formatting/whitespace after the final audit update.                                                        |
| Reproducible packages                                    | PASS                        | Repeated `node scripts\package.mjs` under `TZ=Pacific/Honolulu` retained identical ZIP hashes in both working-tree and clean staged-snapshot builds.                                                                                                        |
| Template maintenance / README HTML                       | N/A                         | Not adopted in this product; no fictitious template check or generated site claim.                                                                                                                                                                          |
| Remote CI / Node 24 / Linux / store / independent review | NOT RUN                     | CI is configured to run the full gate; local execution does not constitute a remote run or approval.                                                                                                                                                        |

### Review and residual limits

The staged snapshot retains the committed product version 0.1.0; the owner's
working tree retains 1.0.0. Its independently validated ZIP has 32,690 bytes,
11 files, and SHA-256
`c59f4c9c54f2a144a4f6978db2b24dd85ad33260cd9ef7443caf82725c6910d5`.
Eight pre-existing changed lines across package/lockfile/README were excluded
from staging; the older audit and extension-manifest edits were not staged.

- Reused existing import/export/selection contracts; introduced only a small
  shared selection resolver and a test fixture for temporary MV3 profiles.
- Runtime changes are limited to the three reproduced regressions above.
- Public tests use only authored/synthetic conversations; examples and tests
  do not need an external service or a ChatGPT account.
- Documentation in `docs/TESTING.md` states commands, coverage scope, provenance,
  real-data privacy handling, and unimplemented-feature limits.
- No claim of 100% input coverage, independent security approval, broad WCAG
  certification, PDF support, or complete V5 acceptance.
- The previous audit's user edits, product version edits, and running preview
  must remain unchanged/uncommitted by this task.
- Task-owned isolated installation directories are removed after final checks;
  no broad deletion or removal of user exports/downloads.

### Completion

- Commit: pending creation; report the resulting hash separately rather than
  rewriting the committed audit to insert its own containing commit hash.
- Final staged scope, references, whitespace, and independent-snapshot check
  passed. The audit-only final update is formatted and checked again before commit.
- No push, pull request, deployment, publication, real-account access, or
  independent review was performed.
