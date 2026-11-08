# Offline foundation and missed cleanup-gate remediation

| Field           | Value                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- |
| Audit ID        | `2026-10-29-offline-foundation`                                                             |
| Created (UTC)   | 2026-10-29T01:12:33Z                                                                        |
| Auditor         | Copilot SDK assistant in VS Code; implementation self-audit                                 |
| Baseline commit | None: unborn `master`; the previous implementation was entirely untracked                   |
| Outcome         | PASS WITH RISKS for the v0.1 offline foundation only; full V5/store release is not approved |

## Request and outcome

- The owner asked why the implementation had not been audited and committed.
  The earlier completion omitted the mandatory V5 cleanup gate. Passing tests
  did not fulfill the separate requirements to write a tracked audit and make a
  focused local commit. This was an implementation-process omission, not a
  technical inability or a lack of permission to make the specified local commit.
- Review the existing foundation, correct confirmed defects in that implementation,
  repeat verification, record evidence, and create its initial local commit.
- Initial state: 41 untracked implementation/configuration files; no prior commit,
  no staged files, no repository-local agent guide, and no existing audit.
  The untracked scope matched the earlier offline implementation.
- Preserve the separate VS Code Project Manager configuration, other repositories,
  user exports, downloads, and the already running preview on port 4173.
- No push, pull request, deployment, publication, account access, or live mutation
  is authorized by this cleanup.

## Analyzing and Reading

Read the supplied V5 specification's cleanup/Definition of Done requirements
(sections 20.2 and 29.2), the local upstream template's
`docs/AUDIT_TEMPLATE.md`, the product README, package/lockfile configuration,
MV3 manifest, build/packaging scripts, and affected source/test consumers.
The upstream template was not modified or adopted wholesale.

The direct implementation review covered import/archive validation, graph
normalization, Boolean search and provenance, message rendering and selection,
worker request handling, snapshot storage/restoration, statistics, and export
serialization. Existing synthetic tests were checked against the advertised
offline behavior. This is a self-review, not an independent security audit.

Acceptance is limited to the currently documented v0.1 foundation:

- The imported snapshot remains local, with no network/account permissions.
- Boolean scope differences, branch handling, unique message IDs, and missing
  metadata are explicit and tested.
- Full selected chat exports are not silently reduced to search snippets.
- Statistics retain the complete source list and both mean definitions.
- Distribution includes its bundled dependency's required notice.
- Current checks pass, evidence is tracked, and a local commit records the result.

## Researching and Planning

- Reuse existing npm/Vite/Vitest/Playwright tooling, the archive/export helpers,
  and synthetic fixtures. No dependency additions or version upgrades.
- The installed `fflate` 0.8.3 license requires retaining its attribution and
  permission notice in redistributed copies. Read the actual installed license,
  rather than inventing attribution or assuming installation alone covers the ZIP.
- Reproduce confirmed findings before correction, add regression assertions,
  regenerate the package, and repeat product/browser checks.
- The owner's existing loopback preview occupies port 4173 (PID 39668).
  Add an optional validated `CHATFLOW_TEST_PORT` override, retaining the default
  and `reuseExistingServer: false`; run tests on 4175 instead of stopping or
  reusing another process.
- Verify public CI action commit references, lockfile pins, package content,
  whitespace, and high-signal secret patterns before committing.
- Do not select the product's still-unapproved license or claim that a local
  build fulfills full V5 or store-release requirements.

## Developing

### Confirmed findings and resolution

| ID  | Finding                                                                  | Reproduction / evidence                                                                                          | Resolution                                                                                                                                                        |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Statistics CSV aggregate record had 11 columns under a 20-column header. | New targeted regression failed: expected 20 columns, received 11.                                                | Pad the aggregate's non-applicable fields explicitly; regression checks header/aggregate/source widths and both means.                                            |
| F2  | The distributable extension omitted the bundled fflate license notice.   | `Test-Path -LiteralPath 'dist\THIRD_PARTY_NOTICES.txt'` returned false; original package inventory had 10 files. | Generate notices from the installed version/license, include them in the build, enforce the complete notice in packaging, and add a distribution regression test. |
| P1  | The previous completion omitted audit and local commit.                  | Unborn branch, all product files untracked, no `.audits` entry.                                                  | This tracked audit and the initial local commit; commit hash is reported separately after creation.                                                               |

| Path                                                 | Change in this cleanup                                                       | Risk                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/exports/export.ts`                              | Complete the statistics CSV aggregate record.                                | Low; report meanings remain unchanged.                               |
| `tests/unit/exports.test.ts`                         | Reproduce and prevent inconsistent statistics CSV widths.                    | Synthetic fixture only.                                              |
| `scripts/assets.mjs`, `scripts/package.mjs`          | Generate and require the actual bundled dependency notice.                   | Build now explicitly fails if the notice/license cannot be retained. |
| `.gitignore`, `.prettierignore`                      | Treat generated notices as generated output; preserve upstream license text. | No user data paths touched.                                          |
| `tests/e2e/extension.spec.ts`                        | Assert the built distribution contains the version and complete license.     | No real account/export data.                                         |
| `playwright.config.ts`, `tests/e2e/workflow.spec.ts` | Optional validated test port and matching network assertion.                 | Default port and server ownership policy unchanged.                  |
| `README.md`                                          | Explain port override, packaged notice, and tracked audit.                   | Documentation only.                                                  |
| `.audits/2026-10-29-offline-foundation.md`           | Record scope, findings, verification, limitations, and commit handoff.       | No private conversations or credentials included.                    |

The initial commit also captures the previously uncommitted offline foundation
under `src`, `tests`, `scripts`, `public`, `.github`, and its root tooling/docs.
Generated builds, icons, notices, browser output, dependencies, and download
artifacts are intentionally ignored rather than committed.

Staging also exposed Git's automatic LF-to-CRLF conversion warnings, with
unspecified text/eol attributes. Add `.gitattributes` to keep auto-detected text
files LF-normalized across Windows/Linux and consistent with Prettier, without
changing global Git settings or marking binary assets as text.

## Clean Up

### Verification

All PASS entries below refer to actual runs during this remediation on Windows
with Node v22.18.0 and npm 11.5.2, not results inferred from the previous turn.

| Check                                                                            | Result                      | Command / evidence                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial CSV regression                                                           | FAIL, reproduced then fixed | `npm test -- -t 'same columns as the header'`: 11 aggregate columns versus expected 20. Final full suite passes.                                                                                                                                           |
| Formatting                                                                       | PASS                        | `npm run format`; final formatting check is also part of `npm run verify`.                                                                                                                                                                                 |
| Strict types, lint, formatting, units, build, and packaging                      | PASS                        | `npm run verify`: strict TypeScript, ESLint, Prettier; 4 unit test files, 56 tests passed; Vite build and MV3 ZIP verification passed.                                                                                                                     |
| Browser and distribution regressions                                             | PASS                        | `$env:CHATFLOW_TEST_PORT = '4175'; npm run test:e2e`: 9 tests passed, including real unpacked MV3/CSP, worker/storage, ZIP import, selection/export, corrupted-storage recovery, responsive/keyboard/theme checks, multitab clearing, and packaged notice. |
| Dependency advisory audit                                                        | PASS                        | `npm audit`: found 0 vulnerabilities, including development dependencies. This is not a guarantee of no defects.                                                                                                                                           |
| Package completeness                                                             | PASS                        | Inspected ZIP via `unzipSync`: 11 files including the complete installed fflate license; manifest has no permissions/host permissions and CSP includes `connect-src 'none'`.                                                                               |
| Exact dependency pins                                                            | PASS                        | Node assertion compared every direct dependency/devDependency version against `package-lock.json`; all are exact matching versions. No installation or lockfile change was required.                                                                       |
| Reproducible packaging                                                           | PASS                        | Compared `Get-FileHash -Algorithm SHA256` before and after `$env:TZ = 'Pacific/Honolulu'; node scripts\package.mjs`; bytes identical.                                                                                                                      |
| Existing preview preserved                                                       | PASS                        | Port 4173 remained owned by PID 39668 after isolated tests; no user server was stopped.                                                                                                                                                                    |
| High-signal credential patterns                                                  | PASS, bounded scan          | `rg` over `src`, `tests`, `scripts`, `.github`, and `public`: no private-key headers, GitHub token patterns, OpenAI-style token patterns, or AWS access-key patterns found. Fixtures contain explicitly synthetic values only.                             |
| Staged whitespace/scope and final-state recheck                                  | PASS                        | `git diff --cached --check` passed; staged file inventory reviewed, with no user exports/generated artifacts/global configuration. `npm run verify` and all 9 Playwright tests passed again after writing and formatting this audit.                       |
| Template maintenance checkups                                                    | N/A                         | `.template\maintenance\RunCheckups.ps1` and the template CLI are not adopted in this product; do not pretend product checks execute them.                                                                                                                  |
| Generated README synchronization                                                 | N/A                         | No README HTML generator/site was adopted; README Markdown is canonical. Generated extension assets/notices were rebuilt and checked.                                                                                                                      |
| CI on Node 24, Linux, and remote GitHub runners                                  | NOT RUN                     | Only this Windows/Node 22 local environment was exercised. The checked-in CI matrix is not a claim of a completed remote run.                                                                                                                              |
| Fresh-clone `npm ci`                                                             | NOT RUN                     | Existing pinned dependencies were present, no manifest dependencies changed, and checks had no missing-package failures.                                                                                                                                   |
| Full V5 acceptance, live-account feasibility, store approval, independent review | NOT RUN                     | Outside this offline cleanup; still require implementation and separate approvals.                                                                                                                                                                         |

Final local artifact: `artifacts/moorkyz-chatflow-1.0.0.zip`, 32,673 bytes,
11 files. SHA-256:
`d58ce3baf0ba74b0c798bc484ac981a416ac7dde0f065569f1305615b00f9477`.
Artifacts remain local generated output, not a published release.

### Quality and safety review

- Existing shared helpers remain in use; no alternate export stack, dependencies,
  remote services, UI rewrite, or unused abstraction was introduced.
- The CSV correction retains the aggregate's original column meanings and
  provides empty values for inapplicable source-specific fields.
- Attribution is generated from the same installed dependency used by the build,
  not a stale manually maintained duplicate. Packaging and tests require it.
- Errors remain explicit: malformed import/query/storage conditions are surfaced,
  and failed import transactions retain the previous snapshot.
- Source text is escaped/text-rendered; CSV formula neutralization, ZIP path/size/
  CRC checks, source URL host/path/identity validation, explicit export review,
  local storage clearing, and no-network CSP remain covered by existing checks.
- This general cleanup audit includes a bounded safety/dependency review only.
  No independent penetration test or external security approval is claimed.

### Residual risks and release blockers

- This is a normalized-text offline foundation, not complete V5 acceptance.
  PDF, advanced splitting, first/last N message export, saved collections,
  semantic/field search, full timezone selection, redaction, cancellation/
  resumability, and all live account actions remain unimplemented.
- Template CLI/checkups, the scheduler, generated README site, complete adoption
  documents, and the full V5 operational process remain unadopted. This cleanup
  fixes audit/commit omission without representing those tools as present.
- Product licensing still requires owner selection; fflate's license notice does
  not grant a license to the new product. Store privacy/policy packaging and
  approval, real export-version compatibility, and live feasibility remain gates.
- Data is stored unencrypted in the browser profile. No-results refers only to the
  imported snapshot; unsupported media/source metadata is not a complete backup.
- Tests exercise synthetic 25,000-message and 1,000-source cases, not every
  possible resource-budget-sized archive. There is no certified performance SLO,
  complete screen-reader/WCAG certification, or guarantee of forensic erasure.

### Final references and documentation

| Reference / content                | Availability / validity | Evidence and impact                                                                                                                      |
| ---------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Local V5 input                     | Read                    | Owner-supplied master specification in Downloads; cleanup gate identified directly. No private export was imported.                      |
| Local upstream audit template      | Read                    | `moorkyz-template\docs\AUDIT_TEMPLATE.md`; four phases, real evidence, explicit limitations, and post-commit hash handoff followed.      |
| Bundled dependency license/version | Verified                | Installed `fflate` 0.8.3 metadata and MIT license read; complete attribution retained in regenerated ZIP.                                |
| CI checkout reference              | Verified                | GitHub get-commit resolved `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683` (4.2.2 release commit).                           |
| CI setup-node reference            | Verified                | GitHub get-commit resolved `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020`. Reachability does not imply remote CI was run. |
| Runtime imports/assets             | Verified                | Strict TypeScript, Vite build, actual MV3 load, and package entry validation passed.                                                     |
| README local audit link            | Verified                | Node filesystem check resolved every local Markdown link in README, including this audit.                                                |

- No full master-spec copy, agent customization, project license, or unrelated
  documentation tree was invented to mask missing adoption work.
- New generated notices are ignored and included only in distribution output.
  Test-owned temporary extension profiles are removed in the existing test
  cleanup; ignored test output is retained as local evidence. No broad deletion.
- Session task tracking covers review, evidence, and local commit separately.

### Completion

- Commit: `PENDING` until creation; report the resulting hash in the completion
  response. As prescribed by the audit template, do not edit this audit afterwards
  merely to insert the hash of the commit containing it.
- Staged scope/whitespace and local reference checks passed; repeat formatting
  and whitespace checks after the final audit update, before creating the commit.
- Human review: pending. Independent review, full V5 acceptance, and publication
  approvals are not implied by this self-audit or passing tests.
- External actions: public dependency-advisory and CI-reference reads only.
  No push, PR, deployment, store submission, account mutation, or credential change.
