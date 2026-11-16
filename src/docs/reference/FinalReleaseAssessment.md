# MOORKYZ ChatFlow — Independent Final Release Readiness Assessment

> **Purpose:** A separate, independent, repeatable GO / CONDITIONAL GO / NO-GO audit to be executed **AFTER** the implementation roadmap has been completed. It must not serve as the implementation agent's self-certification.
> **Product:** Local-first, offline Chromium Manifest V3 extension for searching, analyzing, and exporting **official ChatGPT conversation exports**.
> **Repository:** [https://github.com/Moorky/moorkyz-chatflow](https://github.com/Moorky/moorkyz-chatflow)
> **Prepared:** 2026-11-08. **Assessment status:** NOT RUN — this is the audit procedure, **not** a declaration of release readiness.
> **Companion implementation plan:** `MOORKYZ_ChatFlow_Product_Completion_Roadmap_EN.md`.
> **Baseline known when written:** `master` at `6956b957796d4f357a00e840cba23a1be322dd36` (README only); implementation branch `recovery/verified-20261103` at `1db2d49389fbd123432edd0ff0a8c38823189240` (real app); GitHub private; failed CI run [41548671682](https://github.com/Moorky/moorkyz-chatflow/actions/runs/41548671682). Re-verify every assertion on the candidate under audit.

## Contents

1. [Assessment contract and independence](#1-assessment-contract-and-independence)
2. [Candidate identity and baseline](#2-candidate-identity-and-baseline)
3. [Decision rules and severity](#3-decision-rules-and-severity)
4. [Required test procedure](#4-required-test-procedure)
5. [Release-gate assessment checklist](#5-release-gate-assessment-checklist)
6. [Independent acceptance test matrix](#6-independent-acceptance-test-matrix)
7. [Manual user-journey and UX audit](#7-manual-user-journey-and-ux-audit)
8. [Privacy, security and supply-chain audit](#8-privacy-security-and-supply-chain-audit)
9. [GitHub, documentation and packaging audit](#9-github-documentation-and-packaging-audit)
10. [Final decision and report template](#10-final-decision-and-report-template)
11. [Master independent auditor AI prompt](#11-master-independent-auditor-ai-prompt)
12. [Release execution checklist for the owner](#12-release-execution-checklist-for-the-owner)

---

## 1. Assessment contract and independence
**What this assessment does:** Verifies what the specific candidate **actually does**, using source inspection, clean installs, independent assertions, automated suites, manually observed first-run workflows, artifact checks, privacy/security review, and GitHub release metadata. It produces a **decision with evidence**.

**What it does NOT do:** Treat a README claim as proof; rely only on the implementation agent's test summary; upload or expose any private ChatGPT export; assume every browser/official export version is compatible; certify the Chrome Web Store; approve licensing or publish the repository on behalf of the owner; declare “100% coverage”, “100% privacy”, or “all exports supported.”

**Assessor must:**

- Use a **clean checkout/worktree and clean test environment**, separate from the implementing agent's environment.
- Inspect exact Git SHA and branch, package ZIP, compiled manifest and CI logs.
- Re-run core validations independently; add or execute targeted negative and boundary tests where existing suites are insufficient.
- Record `PASS`, `FAIL`, `NOT RUN`, or `NOT APPLICABLE` for each test, with command, environment, expected/actual evidence and responsible owner.
- Distinguish critical functional failures from known **documented** limitations.
- Leave source, repository settings, releases, privacy and GitHub visibility **unchanged** unless separately authorized for a remediation task. Auditor must not silently “fix tests” to obtain a GO.
**Independence standard:** Ideally a separate reviewer/agent, different working copy, and at least one test on a clean computer/profile. Self-assessment by the implementation agent is a useful preliminary check, **not** independent review.

## 2. Candidate identity and baseline

### Complete before any test
FieldAuditor recordsAudit date (UTC)`TBD`Candidate commit SHA`TBD`Candidate branch / tag`TBD`Repository visibility`private / public`Default branch SHA / files`TBD`Original implementation branch preserved?`yes / no / unverified`Working tree clean?`yes / no`Node / npm / OS`TBD`Chromium / Playwright version`TBD`Package version / extension manifest version`TBD``artifacts/*.zip` SHA-256`TBD`CI run URLs + exact `head_sha``TBD`Project license + approval record`TBD`Reviewer identity and independence`TBD`
### Pre-existing blockers to re-check

- **B-001:** `master` is no longer a README-only branch **if it is still the intended default**; otherwise GitHub's *approved* default points to the reviewed full implementation. Preserve unrelated histories; **do not force-push**.
- **B-002:** GitHub Actions `npm ci` error on `yocto-queue@1.0.0` (`EINTEGRITY`) is resolved by verified provenance/correctly maintained dependencies, not relaxed integrity validation.
- **B-003:** The actual implementation has an approved project `LICENSE`, consistent README/license metadata, and bundled `fflate` MIT attribution.
- **B-004:** The repository has a clear release identity: `package.json`, `manifest.json`, GitHub tag, changelog and ZIP name agree. Initial `1.0.0` strings do not count as a release.
- **B-005:** No private chat export, access token or backup is present in tracked/current/history/distribution data; GitHub private-to-public conversion is owner-approved.
**Immediate NO-GO for a finished public release:** Any unresolved B-001 through B-005. Work may be shared privately or as explicitly labeled work in progress subject to the owner's decision, but not represented as a finished, verified OSS release.

## 3. Decision rules and severity

### Findings severity
SeverityExamplesRelease treatment**Blocker / P0**Data loss on failed import; malicious code execution; private data exposure; bad installable package; checksum mismatch with unresolved provenance; missing license; missing actual code in default branch; CI not green**NO-GO** for completed public/stable release**High / P1**Wrong search results, incorrect exported data/manifests, broken keyboard-only core workflow, untrusted URL activation, persistent crash, missing meaningful real-export test**NO-GO** for finished stable release; no unqualified LinkedIn claims**Medium / P2**Noncritical UI friction, rare but documented supported-feature edge case, minor visual issue not blocking a workflowMay allow **CONDITIONAL GO** if clearly documented with owner-approved issue**Low / P3**Cosmetic copy spacing, optional enhancement or explicitly out-of-scope V5 featureDoesn't block if no misleading claims
### Separate verdicts — never average these into one score
Publication targetGO requiresCONDITIONAL GO meansNO-GO means**A. Public source/portfolio**Approved OS license, no secrets, actual code on discoverable default, honest docs and installation, no unmitigated P0/High security defectOnly publicly label **preview/beta**, explicitly explain unfinished P1 functional issues; not “finished”No legal/secure/discoverable source basis**B. Stable GitHub release**All P0/P1 gates pass, exact-SHA green CI, real installed extension tested, distributable ZIP/hash and complete docsRelease candidate/pre-release only, with limited documented P2 defects; not a stable `v1.0.0` claimAny P0/P1 failures or missing required evidence**C. LinkedIn “finished product” announcement**A+B GO, synthetic live demo, truthful screenshots, owner approval“Technical preview / in development” language, not finished-product claimsNo usable public repo or credible tested demo**D. Chrome Web Store submission**Separate current-policy, privacy, listing, developer-account and distribution review; owner approvalN/A unless preparing a submissionAny policy/listing/store blockers**Rule:** An unexecuted mandatory test is **NOT RUN**, not PASS. “It worked on my computer” does not replace exact-SHA CI or the installed-extension end-to-end test. If an environmental failure is suspected, investigate and re-run on clean conditions; do not waive it without proof.

## 4. Required test procedure

### 4.1 Environment and preservation

- Record git refs, create an audit note and/or immutable checkout; preserve implementation and default branch histories.
- Use read-only inspection for repo configuration; do not push, publish, change default branch, rewrite history, or expose private data during the audit.
- Use Node.js 24 LTS and the repository's locked dependencies. Inspect the lockfile before installing. Avoid npm global state leakage.
- Use a fresh Chromium profile for the actual MV3 extension, not just `vite preview`.
- Keep all synthetic fixtures in `tests/fixtures/` and real-data test sources **outside** the repo. Reports must not contain raw real conversations.

### 4.2 Canonical commands — fresh checkout

```
# Run from reviewed release candidate, in a fresh clone/worktree.
git status --short
git rev-parse HEAD
node --version
npm --version
npm ci
npx playwright install chromium
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run build
npm run test:e2e
npm run test:all
```
On Windows PowerShell the same commands work. If Playwright does not have Chromium installed, install it explicitly; do not weaken the test suite. On Linux CI use the runner's documented Chromium system dependencies; do not assume local Linux test success proves macOS support. **Never ignore npm **`EINTEGRITY`**.**

### 4.3 Private real-export test (required for unqualified compatibility claim)

```
# Your actual official export stays on a local private path.
$env:CHATFLOW_REAL_EXPORT = 'C:\private\exports\official-export.zip'
npm run test:real
Remove-Item Env:\CHATFLOW_REAL_EXPORT
```
Record only: exported archive type, app version and candidate SHA, count of conversations/messages (if non-sensitive), `PASS/FAIL`, warnings by **category/count**, and whether search/export/reopen/clear worked. Do **not** print, attach, screenshot, store in public artifacts or transmit titles, message text, links, attachments, IDs or detailed paths. If no suitable private real export is available, mark `R-01 NOT RUN` and don't claim universal official-export support; approve only a clearly labeled synthetic-tested preview if the other gates permit.

### 4.4 Distribution verification

- Build on the candidate SHA: `npm run build`.
- Independently compute SHA-256 of `artifacts/moorkyz-chatflow-<version>.zip`; compare it to `.sha256` file (Windows `Get-FileHash`; Unix `sha256sum`).
- Extract the package into a new empty directory and load **that extracted artifact** at `chrome://extensions` → Developer mode → Load unpacked.
- Confirm extension action opens the local UI; no node server or developer process is necessary.
- Confirm installed manifest's version, permissions/host_permissions, CSP, icons/service worker and bundled notices.
- Complete demo import → search → viewer → statistics → export → reload → clear data in this installed build.

## 5. Release-gate assessment checklist

### Gate G0 — Repo governance and source identity

- **G0.1** Candidate SHA, original history, review/restore refs and clean worktree verified.
- **G0.2** Canonical public default contains full source, docs and tests; no inaccessible instructions.
- **G0.3** No force-rewrite or silent changes to unrelated branch histories.
- **G0.4** Approved project license and attribution are clear and consistent.
- **G0.5** Public history/current tree/distribution have been checked for credentials, real chats, secrets and private runtime artifacts.

### Gate G1 — Build and CI reproducibility

- **G1.1** `npm ci` succeeds from a clean checkout on Windows and Linux, with checksum checks active.
- **G1.2** Historical `yocto-queue@1.0.0` `EINTEGRITY` failure has a documented verified root cause/corrective action.
- **G1.3** Typecheck, lint, formatting and coverage run and pass on the release candidate.
- **G1.4** Coverage for non-UI code meets the configured four **95%** thresholds; any exclusions reviewed.
- **G1.5** Built ZIP and actual loaded extension pass E2E; GitHub Actions jobs are green on exact SHA (not a parent/other branch).
- **G1.6** No blocked, skipped or manually bypassed required checks are described as passing.

### Gate G2 — Core functional correctness

- **G2.1** Official export ZIP/JSON ingestion with segments and safe failures works.
- **G2.2** Graph normalization preserves branching semantics, source IDs and uncertainty.
- **G2.3** Search Boolean precedence, phrase, filters, scopes, result counts and offsets verified against independent expected fixtures.
- **G2.4** Multi-select, first/last N, pagination and statistics are deterministic and complete.
- **G2.5** All documented export formats, provenance and checksums verified independently.
- **G2.6** IndexedDB snapshot replacement, persistence and clearing withstand expected failures.
- **G2.7** Every advertised feature demonstrated in a shipped (not dev-only) build; unsupported V5 features clearly labeled.

### Gate G3 — Security/privacy and resilience

- **G3.1** Installed MV3 manifest has no unapproved permissions, host access, content scripts, remote code or network channels.
- **G3.2** CSP/HTML/CSV/URL defenses withstand malicious fixtures.
- **G3.3** ZIP/JSON resource limits reject malicious/broken input safely and retain previous snapshot.
- **G3.4** Storage, error and export flows do not leak conversation text in logs, test reports or GitHub output.
- **G3.5** Privacy wording discloses unencrypted local IndexedDB, archive/export scope, source URL semantics and limitations.
- **G3.6** Dependency inventory/license and release package contents audited, with no unresolved high/critical security risk.

### Gate G4 — User experience and accessibility

- **G4.1** Fresh user can run the synthetic demo and complete a meaningful search in ≤3 minutes, with no special developer knowledge.
- **G4.2** Import errors and unsupported source formats are explicit and recoverable.
- **G4.3** Search matching and conversation navigation make scope/branches understandable.
- **G4.4** Export dialog states *full selected chats* versus *search hits* and confirms download content.
- **G4.5** Keyboard-only journey and dialog focus/restoration, error `aria-live`, readable contrast are manually tested.
- **G4.6** 320/390/768/1024/1440px, light/dark and reduced-motion reviewed; no critical overflow, clipped buttons or focus loss.
- **G4.7** No inert controls, placeholder settings that look functional, hidden failures or misleading import-completeness claim.

### Gate G5 — Docs/GitHub/open-source publication

- **G5.1** README immediately communicates value, limitations, current status, real screenshot and verified install instructions.
- **G5.2** Quickstart, architecture, testing, privacy, security, troubleshooting, FAQ, limitations, contribution guide, changelog and license are present, consistent and linked.
- **G5.3** GitHub description, topics, default branch and release assets match shipped project; no broken badges/links.
- **G5.4** All screenshots and sample fixtures are synthetic. Real ChatGPT is identified as trademark; independent/unaﬃliated status clear.
- **G5.5** Tagged source commit, package manifest version, ZIP name and checksum agree; distribution installs without Node for end users.
- **G5.6** Release notes honestly list supported and unsupported features; no unauthorized Chrome Web Store claims.

### Gate G6 — Final approval

- **G6.1** Reviewer independent from coding-agent implementation completes this assessment with evidence.
- **G6.2** P0/P1 defects fixed and retested; any P2 accepted with issue and owner decision.
- **G6.3** Owner reviews legal/license/visibility, default-branch switch, version and public marketing claims.
- **G6.4** Owner explicitly approves publication. No automatic publicity or external account changes based solely on an agent report.

## 6. Independent acceptance test matrix
**Principle:** Test the *observable contract* with known expected values. Use the implementation roadmap's full `I-*`, `N-*`, `S-*`, `E-*`, `D-*`, `W-*`, `U-*`, `P-*`, `R-*` matrix. The following high-value tests must each have fresh independent evidence (or explicit existing-test mapping with exact assertion references). A successful API call alone is never enough.

### 6.1 Deterministic synthetic acceptance fixtures
Existing `tests/fixtures/example-conversations.json` and `tests/e2e/example.spec.ts` document an independent sample with **2 conversations, 6 active-path messages and 7 all-branch messages**. The test expects a search for `"rollback plan"` to match **one chat and two exact message hits**, and exporting the selected chat in active mode to include **four messages** (`example-prompt`, `example-answer`, `example-follow-up`, `example-final`). Re-run and independently inspect the released ZIP contents; do not simply copy the implementation's expectations without comparing the fixture.

IDValidationRequired independent observationT-001Official-format synthetic JSON importExact conversation IDs, message IDs, source hash and totalsT-002ZIP with numbered segmentsAll expected conversations once; segment order stableT-003Branch-switchingActive: 6 / all: 7 in example; discarded answer accessible only in all-branchesT-004Phrase and Boolean searchKnown fixture truth table; exact message ID list and hit offsetsT-005Scope differenceWords split across messages match chat scope but not message scopeT-006Inclusive UTC boundaries`from`/`through` include correct UTC day, exclude outside and undated with date filterT-007Search result → viewer navigationFirst/next/previous points to exact fixture message IDs; context shownT-008Sorting and selectionsSelection IDs/counts exact after filter/sort/pagination, no duplicate IDsT-009StatisticsWeighted and unweighted mean recomputed from fixture data, including empty casesT-010Export all supported formatsValid JSON, CSV, TXT, HTML, statistics; correct full-chat semanticsT-011Export manifestSHA-256 of every payload independently recomputed; IDs/counts/provenance correctT-012ReloadPersisted snapshot survives extension tab/browser reloadT-013ClearSnapshot gone on reopened extension; source ZIP/download still existsT-014Second tabClearing in one tab updates other tab correctly
### 6.2 Malicious data, failure injection, loss prevention
IDValidationRequired independent observationF-001ZIP with traversal path, duplicate entry, corrupted central directoryReject, no out-of-scope file access, previous library unchangedF-002ZIP64, encrypted and multidisk inputsExplicit unsupported error, not empty successF-003Invalid CRC and truncated compressed payloadClear rejection; previous snapshot still worksF-004Actual decompressed size exceeds stated limitsStrict resource limit; no crash/partial replacementF-005Duplicate IDs, cycles and missing graph parentsNormalize aborts; no fake messages/branchesF-006Bad timestamps/project/media/linksUnknown recorded as unknown; source link never fabricatedF-007Search input over query length/token/nesting limitControlled error, subsequent normal queries workF-008Storage quota/existing write transaction abortOriginal dataset remains intact in IndexedDB and worker search indexF-009Worker crash/termination or tab closure mid-importNo partly committed dataset; restart can recoverF-010Failed export/downloadClear error, no stale “download succeeded” messageF-011Attacker-controlled `<script>`, attributes and URL stringsNo DOM execution in viewer or exported HTMLF-012Spreadsheet formula-like cells and unusual whitespaceCSV neutralized, RFC4180 parseableF-013URL spoofing, `javascript:` and mismatched IDsUnsafe links disabled; valid links clearly source-suppliedF-014Unexpected network connectionsInstalled extension CSP blocks; no telemetry/host permissionsF-015Corrupted persisted datasetExplanation and clear/reimport path, no permanent crash loopF-016Multi-tab concurrent imports/clearsNo ambiguous or mixed snapshots; visible status follows committed data
### 6.3 Scale, packaging, accessibility and compatibility
IDValidationRequired independent observationP-0011, 100, 3,000, 10,000 and 25,000 synthetic messagesNo silent truncation or crash; measured import/search/export elapsed and memoryP-0021,000 selected chats, long text, Unicode/emoji/RTLCorrect totals/export; no layout blocking, no hangs beyond documented budgetP-003ZIP at/over configured size limitsAccept within bounds/reject above safely, record actual resource useP-004Clean unzip of release artifact into ChromiumOpens without Node/server, no missing assets, worker startsP-005Manifest & archive SHA-256Exact version/permissions/assets/license; checksum matchesP-006Windows GitHub Actions jobFull `test:all` after clean npm ci, **green**P-007Ubuntu GitHub Actions jobFull `test:all` after clean npm ci, **green**P-008Keyboard-only workflowSearch, filter, navigate, viewer, export, clear usable; focus correctP-009Light/dark + reduced-motion + 5 widthsDocument no critical clipping, overflow, contrast or animation issuesP-010Privacy disclosure and deletionUnencrypted browser storage described; deletion behavior honestly qualifiedP-011Clean clone for developer`npm ci`, `npm run test:all`, `npm run build` work as documentedP-012End-user without NodeDownload/unzip/load extension; synthetic demo and export succeedP-013Fresh real official export (private local runner)Import, query, count, export and clear pass with **metadata-only** evidence
### 6.4 Test quality checks

- No test obtains expected results solely by calling the same production implementation under test. Independent oracle or hard-coded fixture values for core semantics.
- E2E tests run on actual unpacked MV3 extension in a fresh Chromium profile, not merely the `vite preview` app.
- Test assertions verify **content and counts** and absence of unintended side effects; not just button clicks or successful HTTP responses.
- No tests are silently skipped, xfailed or removed because they found a defect; all skips visible and justified.
- Non-UI code reaches the existing configured 95% statement/branch/function/line gates **without artificial coverage inflation**. UI gets behavior coverage via Playwright and manual audit.
- Deterministic fixture generation; clear seeds and resource budgets for stress/fuzz tests.
- Test failure screenshots/videos/traces for **real user data** are disabled; only synthetic E2E traces are eligible for public CI.

### 6.5 Test results ledger (copy one per run)

```
TEST ID: T-___ / F-___ / P-___
Candidate SHA:
OS / Node / Browser:
Command or manual steps:
Fixture (synthetic ID or private test indicator; never raw private content):
Expected assertion:
Observed result:
Verdict: PASS | FAIL | NOT RUN | NOT APPLICABLE
Evidence: local redacted report / CI URL / fixture hash / safe screenshot
Issue / owner / remediation if failed:
Reviewer and UTC time:
```

## 7. Manual user-journey and UX audit
**Journey J1 — First-time synthetic user**

- Install the ZIP in a clean Chromium profile without Node or dev server.
- Open action icon, understand app purpose/privacy limitations in the opening view.
- Start clearly marked synthetic demo, find a useful chat within 3 minutes, browse match context.
- Search with a phrase and Boolean operators; filter role/date and toggle branch policy; describe the results accurately.
- Select a chat, inspect statistics, export ZIP, verify downloaded contents.
- Close/reopen, verify persistence; clear local data, verify empty state and correct notification.
**Journey J2 — Ordinary genuine export (private, controlled)**

- Import one officially generated archive, with private local data only; record counts/error categories without chat content.
- Verify a human-known chat/message and exact match (do not put text in audit report).
- Verify selection/export fidelity against a local independent read/check of source; unsupported media clearly flagged.
- Test failed/unsupported import after successful import; old dataset preserved.
- Assess how understandable storage, import/replacement and clear behavior is without source-code knowledge.
**Journey J3 — Keyboard and responsive**

- Complete J1 entirely with keyboard (Tab, Shift+Tab, Enter, Space, Escape, arrows where relevant).
- Confirm dialog modal focus is trapped appropriately and restored to invoking button after close; no keyboard trap remains.
- Confirm form fields have accessible labels, validation errors are announced, status updates not excessively repeated.
- Check 320/390/768/1024/1440 widths, 200% zoom, light/dark and reduced-motion.
- For severe accessibility concerns perform manual screen-reader smoke test; automated axe checks do not equal complete WCAG certification.
**Journey J4 — Failure UX**

- Invalid file, oversized ZIP, corrupted archive, malformed search, no results, storage denial/quota and interrupted worker all show actionable messages.
- No infinite spinner, disabled action without explanation, false success toast, or unexpected data clearing.

## 8. Privacy, security and supply-chain audit

### Security claims to verify from installed artifacts, not only source

- No remote fetch/exfiltration, remote logging, analytics, account session access, content scripts, host permissions or broad permission requests.
- `dist/manifest.json` is MV3 and its restrictive CSP blocks network/remote scripts; default UI/exports render untrusted strings inert.
- HTML export includes effective restrictive CSP, encoded text and safe verified source links; exported CSV cannot trigger formulas when opened conventionally.
- ZIP central/local entries, CRC, byte limits and safe paths are checked as documented, including compressed archive abuse.
- IndexedDB persistent storage is **not encrypted**; privacy docs do not promise secure erasure or browser-history neutrality.
- Input is a snapshot, not a live or complete account synchronization; generated surrogate IDs and unknown metadata are labeled.
- Derived exports are new user-owned downloads; clearing extension data doesn't delete original archives/downloads.
- Source maps, stack traces and error reports don't include private imported conversation text, names or URLs in public logs/issues.
- Built ZIP and release assets contain only reviewed files; `LICENSE` and dependency notices correctly included.
- Investigated `npm ci` integrity mismatch with provenance and trusted dependencies; no bypass; dependency/license/security review performed.
- Any current Chrome Web Store policy implications are considered separately before store submission. 2026 policies require clear disclosure and single-purpose behavior; don't claim approval unless granted.

### Negative test review
Audit `src/importer/archive.ts`, `normalize.ts`, `src/search/*`, `src/exports/export.ts`, `src/storage/*`, `src/background/worker.ts`, `src/ui/main.ts`, `public/manifest.json`, `scripts/package.mjs` and `scripts/assets.mjs`. Trace untrusted data from source → normalized model → rendered HTML/CSV/links → downloaded ZIP; inspect errors and storage transitions. If a high-severity flaw is found, record a private security report and stop public release until fixed and retested. Do not paste exploit content from private user data into public issue comments.

## 9. GitHub, documentation and packaging audit
**Documentation parity checklist:**

- README feature list matches actual code; no unimplemented live account management, PDF export, binary attachment backup, semantic search, browser store listing or account mutation claims.
- `docs/QUICKSTART.md` and packaged-release install instructions tested by someone without developer assumptions.
- `docs/ARCHITECTURE.md` explains importer, graph model, worker, IndexedDB and export manifest, with module paths and limits.
- `docs/TESTING.md` shows commands that work on current branch, CI URLs, synthetic fixtures and private real-export precautions.
- `docs/PRIVACY.md`, `docs/KNOWN_LIMITATIONS.md`, `SECURITY.md` and `CONTRIBUTING.md` agree on offline data handling and supported scope.
- README/demo images only synthetic; logo/trademark attribution and independent-from-OpenAI wording accurate.
- Dependencies' actual licenses reflected in generated notices; owner-approved project license available at repo root.
- GitHub Issues/PR templates require steps/versions/fixture types but **explicitly warn against attaching real chat exports**.
- Changelog, release notes, issue tracker, roadmap and tag all use matching version semantics.
- Repo has truthful short description, topics, social preview, CI badge pointing to passing exact workflow, default branch showing source.
- Release ZIP and `.sha256` downloadable and instructions verified from fresh profile.
**Optional items not blockers for GitHub source release:** Chrome Web Store review, GitHub Pages marketing site, extensive video production, automated updates, code signing beyond checksum and verified source, semantic search, localization, browser families other than tested Chromium, or any full V5 extension feature. Each optional should have an issue if desired, not an implied promise.

## 10. Final decision and report template
Create one Markdown report for a specific, unchanging release candidate, e.g. `docs/release-audits/2026-11-08-v1.0.0-rc1.md` (adjust date/version). Evidence should use public safe fixtures, URLs and hashes. The private real-export report stays local, excluded by `.gitignore`.

```
# ChatFlow release readiness — <date> / <candidate version>

## Audit identity
- Candidate SHA:
- Branch/tag:
- Repository visibility/default branch:
- Node/npm/OS/Chromium:
- Artifact name and SHA-256:
- Independent auditor:
- CI workflow links (exact SHA):

## Executive verdict
- Public open-source portfolio: GO / CONDITIONAL GO / NO-GO
- Stable GitHub release: GO / CONDITIONAL GO / NO-GO
- LinkedIn finished-product announcement: GO / CONDITIONAL GO / NO-GO
- Chrome Web Store: NOT ASSESSED / GO / CONDITIONAL GO / NO-GO
- Owner approval: PENDING / APPROVED / DECLINED

## Gates
| Gate | Status | Evidence URL / path | Issues |
|---|---|---|---|
| G0 Repository/governance | | | |
| G1 Reproducible CI | | | |
| G2 Core correctness | | | |
| G3 Security/privacy | | | |
| G4 UX/accessibility | | | |
| G5 Docs/GitHub/package | | | |
| G6 Independent approval | | | |

## Test totals
- Passed:
- Failed:
- Not run:
- Not applicable:
- Existing tests independently reproduced:
- New regression tests added:
- Real export test (metadata only, no raw contents):

## Findings
| Severity | Finding | Evidence | Owner / fix / rerun |
|---|---|---|---|
| P0 | | | |

## Verified release claims
- Demonstrated capabilities:
- Documented limitations:
- Claims explicitly removed or postponed:

## Owner-only actions remaining
- License choice and grant:
- Branch/default switch:
- Private → public permission:
- Release/tag publication:
- Chrome Web Store decision:

## Final rationale and signatures
- Independent auditor rationale:
- Audit date (UTC):
- Owner approval reference:
```
**False-GO prevention:** A candidate that changes after audit requires re-running affected tests and ideally all gates before tagging. The GitHub Actions run's `head_sha` must exactly match the released commit, or a documented reproducible tag/source packaging process must establish equivalence. Any unresolved high severity issue results in NO-GO for a stable release, regardless of how many minor checks passed.

## 11. Master independent auditor AI prompt
Give this entire block to a **different agent** than the one that implements the roadmap. It may create **audit reports and test proposals**, not publish changes or rewrite source without explicit remediation authorization.

```
ROLE: Independent software release auditor, security-conscious QA engineer,
Chromium Manifest V3 browser-extension reviewer, and GitHub release verifier.

TARGET: Moorky/moorkyz-chatflow. Audit the ACTUAL finalized candidate commit,
not the historical review branch just because earlier notes mention it.

REFERENCE DOCUMENTS:
1. MOORKYZ_ChatFlow_Product_Completion_Roadmap_EN.md
2. MOORKYZ_ChatFlow_Final_Release_Assessment_EN.md (this document)

OBJECTIVE:
Give evidence-based independent GO / CONDITIONAL GO / NO-GO decisions for
(A) public open-source portfolio, (B) stable GitHub release, (C) LinkedIn
finished-product announcement, (D) Chrome Web Store submission separately.
Do not use an average score; treat non-negotiable gates as binary.

IMPORTANT PREVIOUS OBSERVATIONS TO REVERIFY:
- Historical master was README-only; real app lived on recovery/verified-20261103.
- Source branch was private; README/project license had inconsistencies.
- Historical CI run 41548671682 failed on both Windows/Linux at npm ci due
  to yocto-queue@1.0.0 EINTEGRITY. No tests ran on that CI attempt.
- Current product is a local-first OFFLINE extension for official exports,
  not an online ChatGPT manager or synchronization tool.

HARD REQUIREMENTS:
1. Do not modify default branch, force push, publish, change repository
   visibility, release a tag, submit to Chrome Web Store, or alter licensing.
   Only recommend owner-approved actions.
2. Never upload actual user exports; never put chat text/titles/IDs/URLs into
   public logs, screenshots, issues or CI artifacts. Real-export tests are
   opt-in and local only; report safe metadata and pass/fail.
3. Re-run fresh npm ci with integrity checking active. If EINTEGRITY reappears,
   STOP the stable-release audit and report blocker; investigate provenance.
4. Independently execute unit/integration/coverage, installed MV3 E2E,
   packaging, source-distribution and applicable security regression tests.
   No test result is PASS unless executed on this exact candidate or independently
   traced to exact-source CI. Record exact commands/environment/fixture/results.
5. Test core truth-table scenarios independently (especially Boolean search,
   conversation branches, full-chat exports, manifest counts/hashes, and
   failed import atomicity). Re-running a test that verifies its own
   implementation is not sufficient.
6. Inspect built manifest/ZIP for zero unapproved host permissions/network
   channels, CSP, bundled license notices, version alignment, SHA-256.
7. Run at least one clean end-user installation/demo workflow in Chromium
   from extracted production ZIP, with no dev server.
8. Check keyboard-only and narrow viewport usability and failure messages.
9. Verify project license, history safety, public default branch, README,
   docs, issues, GitHub metadata, CI status and actual release artifacts.
10. Don't overclaim security, completeness, browser/store compatibility, or
    official affiliation. Clearly distinguish scope-limited tests.

MANDATORY OUTPUT:
- Candidate identity and environment table.
- Gate-by-gate status G0..G6 with exact evidence or NOT RUN.
- Independent acceptance test matrix T/F/P with observed expected values.
- Reproducibility and CI verification (both Windows and Ubuntu, exact SHA).
- Supply-chain/lockfile incident resolution validation.
- Findings list with P0/P1/P2/P3 severity, file/line and reproduction.
- Claims safe to publish, claims to remove, explicit known limitations.
- Separate publication GO/CONDITIONAL GO/NO-GO decisions and justification.
- Owner-only actions and final approval checklist.

If a P0/P1 issue occurs, conclude NO-GO for stable release and describe precise
fixes and reruns. Do NOT hide findings, rewrite tests, rationalize failed CI,
or pretend a scheduled future test has already passed. No background work.
```

## 12. Release execution checklist for the owner
**Only after the independent auditor reports appropriate GO decisions:**

- Personally approve the project license and confirm the public history contains no secrets/private conversations.
- Confirm the chosen canonical default branch and preserve all pre-existing refs; make any branch-setting change explicitly.
- Review exact candidate SHA, green CI, verified installed extension and package SHA-256.
- Decide whether to make the private repository public; do not infer consent from a completed AI task.
- Publish release/tag matching audited candidate and attach verified ZIP/checksum and concise changelog.
- Validate public anonymous access to repo, README images, docs, release ZIP and checksum.
- Post the synthetic demo and honest LinkedIn message only after those checks.
- Open issues for post-release improvements; document security contact and expected maintenance scope.
- Treat Chrome Web Store submission as a separate optional, policy-reviewed process.

### Authoritative external references (recheck at time of audit)

- GitHub changing default branch: [https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/changing-the-default-branch](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/changing-the-default-branch)
- GitHub rulesets: [https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository)
- Chrome Web Store developer policies and 2026 update: [https://developer.chrome.com/blog/cws-policy-updates-2026](https://developer.chrome.com/blog/cws-policy-updates-2026)
- Chrome Web Store publication: [https://developer.chrome.com/docs/webstore](https://developer.chrome.com/docs/webstore)
**End of independent release assessment. This document is NOT evidence that any test has already been executed.**