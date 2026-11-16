# MOORKYZ ChatFlow — Product Completion & Open-Source Release Roadmap

> **Purpose:** Implementation roadmap and master agent brief for turning the *existing offline ChatGPT-export explorer* into a reliable, easy-to-use, professionally presented open-source portfolio release.
> **Language:** English. **Prepared:** 2026-11-08. **Status:** Planning document; no code, CI, or runtime changes performed by this document.
> **Repository:** [https://github.com/Moorky/moorkyz-chatflow](https://github.com/Moorky/moorkyz-chatflow)
> **Inspected implementation:** `recovery/verified-20261103` at `1db2d49389fbd123432edd0ff0a8c38823189240`; default `master` at `6956b957796d4f357a00e840cba23a1be322dd36`. **Re-check all refs before starting.**

## Contents

1. [Product decision and release objective](#1-product-decision-and-release-objective)
2. [Verified repository baseline and blockers](#2-verified-repository-baseline-and-blockers)
3. [Release scope and definition of done](#3-release-scope-and-definition-of-done)
4. [Architecture and UX direction](#4-architecture-and-ux-direction)
5. [Step-by-step implementation roadmap](#5-step-by-step-implementation-roadmap)
6. [Test inventory and expanded test matrix](#6-test-inventory-and-expanded-test-matrix)
7. [CI, packaging, dependency and security controls](#7-ci-packaging-dependency-and-security-controls)
8. [Documentation and GitHub presentation](#8-documentation-and-github-presentation)
9. [Demo and LinkedIn launch assets](#9-demo-and-linkedin-launch-assets)
10. [Phase dependencies, gates, and estimates](#10-phase-dependencies-gates-and-estimates)
11. [Master implementation prompt for a coding agent](#11-master-implementation-prompt-for-a-coding-agent)
12. [Evidence required for independent assessment](#12-evidence-required-for-independent-assessment)

---

## 1. Product decision and release objective
**Keep the product small, complete and credible.** ChatFlow is an **offline, local-first Chromium Manifest V3 browser extension** that imports an **official ChatGPT conversation export**, enables precise search and analysis, and exports selected conversations and statistics without connecting to a live ChatGPT account. It is **independent of OpenAI**. The project must not imply partnership, endorsement, real-time synchronization or account access.

**Primary release promise:** “Search, inspect, analyze, and export your ChatGPT history from your own official export — locally and without an account connection.”

**Primary user journey:** Install from verified release ZIP → open extension → use synthetic demo or import a local official export → understand import coverage → search and filter → inspect exact messages and conversation branches → select chats → preview and confirm export → download/check an archive → close, reopen and optionally clear local data.

**Audience:** Developers, researchers and power users with their own exported conversation archive. **Portfolio evidence:** TypeScript architecture, careful schema normalization, Boolean search engine, privacy-first browser extension, data integrity, worker/storage lifecycle, CI, test engineering, and a polished end-to-end UX.

**Explicitly excluded from this release:** live ChatGPT API/account access, scraping, mutations or deletions of live chats, changing ChatGPT project assignments, browser automation of restricted features, attachment binary restoration, multi-device syncing, semantic/vector search, fuzzy search, ChatGPT API cost tracking, commercial billing, native desktop app, Firefox/Safari extension support, and arbitrary format import. Do not add advanced V5 backlog features merely to inflate feature count.

## 2. Verified repository baseline and blockers

### 2.1 Source inventory
AreaCurrent implementation / evidenceRelease consequenceGitHub branch`master` tree contains **only **`README.md`; full application is on `recovery/verified-20261103`**P0:** select a canonical default branch without destroying unrelated historiesPrivacyRepository currently **private****P0:** only turn public following owner approval and history/secret reviewRuntime`package.json`: Node `>=22.18`; Node 24 recommended; Vite/TypeScript/MV3Pin/document supported Node versions; don't silently downgradeApp structure`src/ui/main.ts`, `src/ui/styles.css`, `src/background/worker.ts`, `src/shared/model.ts`Keep modular architecture; improve UI without wholesale rewriteImport`src/importer/archive.ts`, `src/importer/normalize.ts`: ZIP/JSON, safety budgets, source fingerprint, conversation graphsPreserve strict input validation and clear incomplete-content warningsSearch`src/search/query.ts`, `src/search/index.ts`: exact phrases, AND/OR/NOT, chat/message scope, active/all branchesPreserve semantics; document and regression-test thoroughlyPersistence`src/storage/database.ts`, `validate.ts`: IndexedDB, one persisted normalized snapshotPreserve atomic replacement; verify quota/error/recovery UXExport`src/exports/export.ts`: TXT/JSON/CSV/HTML, statistics, SHA-256 manifest in ZIPVerify every format, counts, data escaping and provenanceTest frameworkVitest, Playwright; `tests/unit`, `tests/integration`, `tests/e2e`, `tests/real`Expand failure/adversarial tests rather than duplicate existing happy pathsCoverage`vitest.config.ts` requires **95% each** for lines/statements/functions/branches outside UIRetain thresholds; supplement with UI/E2E and evidenceCI`.github/workflows/ci.yml`: Windows + Ubuntu, Node 24, `npm ci` then `test:all`**P0:** remote CI must pass on release candidateCI failureWorkflow run **41548671682**, 2026-11-02: both OS jobs failed at `npm ci` with `EINTEGRITY` for `yocto-queue@1.0.0`**P0:** integrity/provenance investigation; never bypass checksum validationLicenseImplemented branch has **no approved **`LICENSE`; `master` README says Apache-2.0; GitHub reports no license**P0:** owner chooses license and resolves inconsistencyReleaseNo GitHub Releases; `package.json` and manifest say `1.0.0`, yet README calls it *offline foundation*, not store-readyDecide honest version/tag after audit; version strings alone prove nothingGitHub metadataNo topics, homepage or release; CI unsuccessfulPolish for discoverability and third-party installationPackaging`scripts/assets.mjs`, `scripts/package.mjs` generate MV3 ZIP, checksum, dependency noticeKeep deterministic packing and install real ZIP in fresh profileSources: [`README.md` on implementation branch](https://github.com/Moorky/moorkyz-chatflow/blob/recovery/verified-20261103/README.md), [`docs/TESTING.md`](https://github.com/Moorky/moorkyz-chatflow/blob/recovery/verified-20261103/docs/TESTING.md), [`CI failure`](https://github.com/Moorky/moorkyz-chatflow/actions/runs/41548671682), [`publication audit`](https://github.com/Moorky/moorkyz-chatflow/blob/recovery/verified-20261103/.audits/2026-11-03-publication-audit.md). These describe the inspected commit, **not a promise about future code**.

### 2.2 Key risks and non-negotiables

1. **Repository history:** The existing default branch and implementation branch have documented divergent/unrelated histories. **Never force-push, reset, or delete either branch to make the UI look cleaner.** Preserve refs. Possible owner-approved solution: change GitHub's default branch to a newly reviewed release branch, or prepare a documented merge/import that preserves both histories. The owner chooses.
2. **Dependency integrity:** Investigate why the registry returned content whose SHA-512 differed from the lockfile expectation. Re-run against a clean cache/verified registry, examine lockfile and package provenance, document the root cause. **Never disable integrity checks, blindly replace a known-good hash, or use **`--force`** as a release fix.**
3. **Real user data:** Official exports can contain sensitive personal information, business material and secrets. No external telemetry, error-report uploads, public fixtures made from private conversations, or CI access to user data. The normalized snapshot currently resides **unencrypted** in IndexedDB; state this visibly.
4. **Honest coverage:** Unsupported attachment binaries, schemas, alternate branches, timestamps, project mappings and missing IDs must be marked unknown/unavailable rather than guessed. Always keep the original official export outside ChatFlow.
5. **Browser and Web Store:** Public GitHub release and Chrome Web Store publication are **different gates**. Release is acceptable without store approval, provided distribution is clear. Store policies and listing privacy requirements are reviewed separately.

## 3. Release scope and definition of done

### 3.1 Must-have working product

- Fully functional MV3 extension installed from a clean production artifact, **not only Vite preview**.
- Two entry routes: **Try synthetic demo** without real data, and **Import a file** for authorized personal exports.
- Clear onboarding, import progress, actionable errors, no silent replacement or content truncation.
- Search by term/phrase/Boolean expression with roles/dates/title/message/scope/branch filters, clear results and precise hit navigation.
- Select many chats deterministically; show exact selected counts; statistics and export summaries agree.
- All advertised export formats produce valid content and independently verifiable manifests.
- Browser reload retains an imported snapshot; invalid replacement doesn't destroy it; clear-data really removes it from extension storage (not source files or downloaded ZIPs).
- Keyboard-friendly, high-contrast light/dark, reduced-motion, responsive UX including narrow viewports.
- Offline behavior with no host/network permissions or unsanctioned remote calls.
- Healthy reproducible tests, a correctly packaged download, accurate public documentation, approved license, and a trusted release decision.

### 3.2 Release gates
**G0 — Repository reconciled:** canonical checked-out code on intended default branch; old refs preserved; branch selection approved; LICENSE established; clean git status.

**G1 — Reproducible:** `npm ci` works from clean cache on Windows and Linux; Node 24 full CI green on exact candidate; dependency provenance reconciled.

**G2 — Correctness:** core + storage/worker + extension E2E + packaging + all documented regression tests pass; source metadata not silently fabricated; independently validate key output against fixtures.

**G3 — Privacy/security:** zero unapproved permissions/connections, no P0/P1 security defects, hostile exports handled safely, output HTML/CSV sanitized, no real exports in CI or tracked files.

**G4 — UX:** first-time user completes demo/import/search/inspect/export/clear without knowing Git/Node; keyboard and screen-reader smoke tests; no critical overflow or dead control.

**G5 — Documentation and public GitHub:** release instructions tested from fresh clone and extracted artifact, truthful README, docs, LICENSE/NOTICE, security contact, changelog, screenshots with synthetic data, CI badges and correct metadata.

**G6 — Independent sign-off:** second reviewer runs `MOORKYZ_ChatFlow_Final_Release_Assessment_EN.md` against release-candidate SHA; owner approves public visibility and release. **A coding agent must not self-certify or publish by default.**

## 4. Architecture and UX direction

### 4.1 Preserve the architecture

```
Official export ZIP / conversations.json
          ↓
src/importer/archive.ts       strict ZIP/JSON safety limits and source SHA-256
          ↓
src/importer/normalize.ts     graph → normalized dataset + provenance/warnings
          ↓
src/background/worker.ts     serialized import / search / stats / export
          ├── src/storage/database.ts   IndexedDB one-snapshot transaction
          ├── src/search/query.ts       deterministic Boolean parser
          ├── src/search/index.ts       candidate/hit search
          ├── src/analytics/statistics.ts
          └── src/exports/export.ts     ZIP + manifest / SHA-256
          ↓
src/ui/main.ts + styles.css  accessible responsive presentation
          ↓
Chromium MV3 (manifest + action service worker)
```
Refactor only where measurable technical debt exists: extract reusable UI components and state/event contracts from `src/ui/main.ts` if needed to make regressions easier, but don't introduce a heavy UI framework or external backend for a simple offline app. Existing `src/ui/main.ts` is ~690 lines; split by actual responsibilities (onboarding, search, result cards, viewer, export dialog, status/errors), not arbitrary file-size targets.

### 4.2 Recommended information architecture
SurfaceEssential user actionProgressive disclosureWelcome / empty libraryDemo, import official export, read privacy noteTechnical format limits in expandable helpLibrarySearch, filters, result count, imported source/coverageAdvanced Boolean/branch filters collapsed until neededConversation viewerRead exact messages, jump hit next/previous, view branch stateMetadata and source IDs available without clutterSelection barSelected count, select result set, statistics, exportAdvanced split/selection details only when supportedExport reviewExplain selected chats, format, all-vs-matching semantics, file naming, privacyDetailed manifest schema in linked docsPrivacy / settingsSource storage location, clear data, offline guarantee, limitationsTroubleshooting and technical integrity details**Copywriting principles:** Use “Imported 127 conversations from this export” (not “All your ChatGPT conversations”). Use “4 conversations match; 11 messages match” (not ambiguous “11 results”). Use “Download all messages in selected conversations” (not “Export matching messages,” which is currently unimplemented). Clearly explain “All branches” vs “Active branch.” Treat all dates as **UTC message dates** unless a timezone selector is explicitly implemented and tested.

### 4.3 Usability and accessibility acceptance

- Primary action available without scrolling on typical laptop viewport; native file picker and drag/drop only if drop is actually supported and tested.
- Long titles, URLs, Unicode, emoji, RTL text, 25k-message results and 1k-source selections don't break layout.
- No unreachable modal: Escape, close button, focus containment/restoration; prevent action while busy and describe progress.
- Semantic headings/form labels, actionable error text, `aria-live` without floods, visible focus indicators, keyboard-only operation.
- 320px, 390px, 768px, 1024px, 1440px screenshots/measurements; light/dark and reduced-motion. WCAG 2.2 AA as a design target, **not** a certification claim without proper audit.
- A 3-minute self-contained synthetic demo can be recorded without any personal data.

## 5. Step-by-step implementation roadmap

> Each checkbox is a standalone deliverable. **Required proof** means tests, screenshots, diffs, logs or run artifacts, not agent narrative. Keep one focused commit per task and update docs in the same PR. Effort is a rough engineering estimate for a developer familiar with the repository, not a delivery promise.

### Phase 0 — Freeze and reconcile baseline (P0; ~0.5–2 days)

- **CF-001 Capture the baseline.** Record exact SHA, branches, file list, current CI statuses, version strings and repository visibility. Inspect repo for ignored data, nested histories, secrets and published refs. **Files:** `.audits/`, `README.md`, `.gitignore`; GitHub settings. **Proof:** versioned inventory with hashes. **Accept:** master/recovery divergence explicitly documented; no ref modified or private content exposed.
- **CF-002 Decide canonical branch safely.** Propose at least two preservation-safe approaches, recommend the reviewed full-source branch as canonical, and request owner approval before changing default branch or combining histories. **Proof:** compare-base report, backup refs, migration/rollback steps. **Accept:** exact code that visitors clone contains the executable app and docs; previous branch remains reachable.
- **CF-003 Fix dependency integrity failure.** Reproduce workflow `41548671682`, inspect `package-lock.json` entry and npm metadata for `yocto-queue@1.0.0`, verify expected bytes/provenance, and investigate registry/cache/proxy inconsistency. **Files:** `package-lock.json`, `.github/workflows/ci.yml`, `docs/TESTING.md`. **Proof:** incident note with root cause and clean-run logs. **Accept:** clean `npm ci` completes on both Windows/Linux without suppressing `EINTEGRITY` checks; lockfile diffs justified.
- **CF-004 Formalize release licensing.** Owner chooses Apache-2.0 or another compatible license. Add `LICENSE`, copyright/notice where appropriate, keep `fflate` MIT notice, make master README and GitHub metadata consistent. **Proof:** approved license decision, scanned dependency notice. **Accept:** no contradiction between README, LICENSE, distribution and GitHub license detection.
- **CF-005 Establish release issue ledger.** Create/update GitHub milestones or issue labels (`P0`, `P1`, `P2`, `security`, `ux`, `testing`, `docs`, `release`), align open tasks to the roadmap. **Proof:** task-to-commit mapping. **Accept:** no silent exclusions or “done” without evidence.

### Phase 1 — Product correctness and import integrity (P0; ~2–4 days)

- **CF-010 Reconcile supported export schemas.** Test current ZIP/JSON exporter variants; document supported official `mapping` shape, numbered segments, gaps, unsupported content and unknown fields. **Files:** `src/importer/normalize.ts`, `archive.ts`, tests. **Accept:** supported inputs ingest deterministically; incompatible schemas fail with clear errors, old snapshot untouched.
- **CF-011 Strengthen hostile/edge imports.** Stress ZIP directory size, path traversal, duplicate names, symlink-like names, encryption flags, ZIP64/multidisk rejection, overlapping entries, CRC mismatch, malformed UTF-8, BOM, JSON depth, massive text segments, out-of-order segments, decompression overflow. **Files:** `archive.ts`, tests/unit. **Accept:** bounded resources; no files written outside extension; no old-data loss.
- **CF-012 Validate graph semantics.** Duplicate IDs, orphan parents, disconnected cycles, missing `current_node`, alternative branches, shared ancestors, duplicate message IDs and missing timestamps. **Files:** `normalize.ts`, `model.ts`. **Accept:** active path never guessed; duplicate/cyclic structures rejected; source-specific warnings visible.
- **CF-013 Make reimport safe and understandable.** Before overwrite, show imported source and “replace current local snapshot” semantics; verify failed validation/aborted IndexedDB save preserves previous searchable index and data; evaluate if exported backup prompt is useful before replacement. **Files:** `src/background/worker.ts`, `src/storage/*`, UI. **Accept:** no silent loss; interrupted transaction is recoverable; no unintended merge of unrelated exports.
- **CF-014 Verify core search correctness.** Boolean precedence, negative-only logic, phrases/escaping, title-vs-message scope, role/date filter order, 32-depth/256-token budgets, source hit offset highlighting, branch policy. **Files:** `src/search/*`, `tests/unit/search*`. **Accept:** exhaustive truth-table fixtures and independent expected IDs; exact counts agree.
- **CF-015 Verify export parity and provenance.** Every documented content/format/branch combination, full-chat semantics, source/result counts, escaped HTML, safe CSV, filenames, SHA-256 manifests, malformed download handling. **Files:** `src/exports/export.ts`, `tests/unit/export*`, E2E. **Accept:** independently unpackable ZIP; hashes match; no unrequested truncation, no arbitrary script execution.

### Phase 2 — Finish UX, preserve all features (P0/P1; ~3–6 days)

- **CF-020 Audit every visible control.** Create a UI control inventory (label, handler, state, disabled/loading/error behavior). Remove decorative/inert controls or implement their advertised action. **Files:** `src/ui/main.ts`, CSS. **Accept:** no dead buttons, fake integration settings or misleading status text.
- **CF-021 Simplify first-run experience.** Clear two choices: “Try demo” / “Import export”; show offline/privacy explanation; native picker and visible import limitations. **Accept:** first-time user finishes synthetic demo without instructions in 3 minutes.
- **CF-022 Improve library search hierarchy.** Single prominent search bar, clear result metrics and quick filters; tuck advanced options into expandable section with persistent understandable values. **Accept:** query errors are inline, recoverable; changing a filter does not delete selection unexpectedly.
- **CF-023 Polish viewer and branch navigation.** Clear per-message context, exact match scroll/highlight, branch mode warning, next/previous hit, missing-content placeholders, source metadata. **Accept:** branch changes produce expected IDs, including shared ancestor counting once.
- **CF-024 Improve selection and export review.** Keep one-click select all matches, first/last N, individual checkboxes, selected count, clear selection, statistics; make “full selected chats vs matched messages” unmistakable before download. **Accept:** selection and payload parity under sort/filter changes and pagination.
- **CF-025 Make errors first-class UX.** Distinguish unsupported export, resource cap, corrupted ZIP, worker crash, storage quota, disk download error, empty result, malformed query, unsupported media. Provide specific remedies without implying repairs occurred. **Accept:** errors never leave stuck spinners or clear previous snapshots.
- **CF-026 Accessibility and responsiveness.** Keyboard-only workflows; proper focus management in dialogs, screen-reader announcements, contrast, touch targets, reduced-motion; measure desktop/narrow layouts. **Accept:** no horizontal document overflow or blocked primary actions at 320/390/768/1024/1440px; axe automated checks + manual keyboard review.
- **CF-027 Assess performance with production-like fixtures.** Use 1/100/3,000/10,000/25,000 message test sizes plus 1,000 selected sources; profile import time, search time, memory, rendering and export peak memory. Optimize only verified bottlenecks. **Accept:** no hang/crash/truncation within documented input budgets; baseline measurements recorded with environment.
- **CF-028 Decide browser preview strategy.** Keep synthetic preview if it reduces adoption friction, but document that installed extension is the product. Ensure the preview cannot accidentally imply live account or persistent private data synchronization. **Accept:** one canonical UX and shared tested code.

### Phase 3 — Security, reproducibility and CI (P0; ~2–4 days)

- **CF-030 Restore green GitHub CI.** Windows + Ubuntu Node 24 clean install, TypeScript, ESLint, Prettier, 95% core coverage, production package, Playwright installed-extension E2E. **Files:** `.github/workflows/ci.yml`, `package-lock.json`. **Accept:** all required checks green on exact release candidate SHA; no skipped job mistaken for pass.
- **CF-031 Lock down extension permissions.** Check built `dist/manifest.json` and ZIP (no `permissions`, `host_permissions`, content scripts, host access, broad CSP exceptions, remote code, analytics). **Accept:** verified request blocking and no unexpected outbound network in normal and malicious fixture runs.
- **CF-032 Security regression sweep.** XSS through titles/messages/URLs, CSV formula injection, HTML export execution, archive bombs, prototype-pollution-like keys, malformed graph, untrusted source links, sensitive error leakage, trusted extension CSP. **Accept:** hostile content inert; no user data exfiltration or unverified links.
- **CF-033 Check storage privacy and disclosure.** Confirm IndexedDB non-encryption disclosure, replacement/removal behavior, multi-tab broadcasts, extension deletion behavior where appropriate; preserve original ZIP and downloads. **Accept:** privacy policy accurately describes data processing, not absolute secure erasure.
- **CF-034 Release dependency/supply-chain check.** Dependency/license review, pin action SHAs, restrict GITHUB_TOKEN permissions, audit distribution contents for secrets/test data; checksum signing optional but document verification. **Accept:** release ZIP is derived from audited SHA; checksum verified independently.
- **CF-035 Expand failure-injection and browser tests.** Use matrix in §6; ensure tests are robust on a clean system, not dependent on persistent browser profile or network. **Accept:** regression suite catches at least one intentionally introduced defect in each critical subsystem (via temporary local mutation or mutation testing, not committed breakage).

### Phase 4 — Documentation, OSS and distribution (P0/P1; ~2–3 days)

- **CF-040 Rewrite README for first-time visitors.** Problem/value, hero screenshot/GIF, offline/privacy guarantee accurately qualified, feature table, 60-second synthetic demo, install package + developer build paths, limitations, test status, supported OS/browser, link to docs. **Accept:** every link and command verified from new clone.
- **CF-041 Update product docs to implementation reality.** Keep `docs/TESTING.md`, add/verify `docs/QUICKSTART.md`, `docs/ARCHITECTURE.md`, `docs/PRIVACY.md`, `docs/TROUBLESHOOTING.md`, `docs/FAQ.md`, `docs/RELEASE.md`, `docs/KNOWN_LIMITATIONS.md`; mark V5 as *future* rather than existing. **Accept:** no broken relative links or unsupported claims.
- **CF-042 Contribution readiness.** `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue/PR templates, relevant `CODEOWNERS` optional, `.editorconfig`, `CHANGELOG.md`, explicit support policy; retain `AGENTS.md` only if useful. **Accept:** contribution/test workflow reproducible and security-reporting channel works.
- **CF-043 Distribution audit.** Clean GitHub release ZIP contains only MV3 installable files, icons, license notices, exact manifest version; independent SHA-256 file; instructions for installing unpacked. **Accept:** a stranger can install and run it without Node or npm if using release ZIP.
- **CF-044 GitHub presentation.** Choose approved default branch, set description/topics, social preview, optionally GitHub Pages *synthetic demo only*, one honest CI badge, release notes/tag, no credentials or private exports in history. **Accept:** public link lands on real, complete code and trustworthy README.
- **CF-045 Chrome Web Store decision.** Treat as **separate release**: review Chrome Web Store policies, single-purpose and privacy disclosures, developer account, screenshots and store review, only after GitHub release. **Accept:** no “available on Chrome Web Store” claim before approval.

### Phase 5 — Independent audit and public launch (P0; ~1–2 days)

- **CF-050 Freeze release candidate and request independent review** using the companion assessment. Reviewer must not reuse implementation-agent success claims as evidence.
- **CF-051 Run two real user journeys on a fresh profile:** synthetic sample (shareable) and a real official export (strictly private, locally held, with no traces/screenshots/content in reports). Include import → search → inspect → export → validate ZIP → persist → clear.
- **CF-052 Resolve all P0/P1 findings and rerun gates on new exact commit SHA.** No “known failure is probably environment-related” exceptions without verified diagnosis.
- **CF-053 Owner approves canonical branch, license, version, visibility and release.** Agent may prepare but **must not** make private repo public, change default branch, force push or publish GitHub/Chrome Web Store release without explicit owner approval.
- **CF-054 Publish GitHub release and LinkedIn portfolio post.** Link real repository, verified release/tag, short synthetic demo and architecture notes. Capture feedback and real-world compatibility issues as GitHub issues.

## 6. Test inventory and expanded test matrix

### 6.1 Already present: DO NOT duplicate without a reason
Current `docs/TESTING.md` lists existing coverage for ZIP/JSON, normalization/graphs, Boolean search, selection, stats, exports, IndexedDB transactions, worker lifecycle, MV3 extension, synthetic 1–25k messages, four viewport widths and packaging. Existing `tests/e2e/example.spec.ts` independently checks known sample message IDs and hashes; `tests/e2e/extension.spec.ts` launches actual MV3 extension; `tests/real/local-export.spec.ts` is opt-in with `CHATFLOW_REAL_EXPORT`. Keep and extend these tests. **Prior self-audit success does not override currently failing GitHub CI.**

### 6.2 Additional/strengthened tests required before release
Each ID below requires test **fixture, command, expected assertions and recorded result**, or a documented reason why an equivalent existing test already proves it. Tests should assert **meaningful outputs**, not merely “did not throw.”

IDLayerScenario / fixtureRequired assertionI-01Import unitValid `conversations.json` UTF-8 / BOMCorrect chat IDs, counts, timestamps, SHA-256 source IDI-02Import unitOfficial export ZIP, numbered segments out of lexical orderNumeric deterministic merge, no omitted/duplicated conversationI-03Import unitZIP traversal (`../`, absolute, drive path, backslash)Import rejected; no path is read/written outside allowed areaI-04Import unitZIP duplicate names, directory/header mismatchReject with explicit error, old snapshot retainedI-05Import unitEncrypted, multi-disk, ZIP64 archiveReject as unsupported; no successful-empty importI-06Import unitCRC mismatch, bad central/local record, truncated ZIPIntegrity failure, no committed replacementI-07Import unit128 MiB input / 256 MiB expanded / 10k entry boundariesCorrect accept at limit/reject over limit; bounded memoryI-08Import unitInvalid UTF-8, malformed JSON, unsupported root schemaClear failure with no data lossI-09Import unitZIP bomb/false metadata sizeStreaming limit prevents oversized expanded bytesI-10Import unitNested JSON/huge text/Unicode and surrogate casesBounded behavior, no crash or truncation; document limitsN-01NormalizationGraph with regeneration + active pathActive/all branch IDs correct; ancestors not double-countedN-02NormalizationMissing/broken parent, cycle, disconnected cycleExplicit rejection; never invent a message chainN-03NormalizationDuplicate conversation/message IDs across segmentsRejected without partial importN-04NormalizationMissing IDs, times, source URLs and project metadataWarnings, safe surrogate IDs, unknown remains unknownN-05NormalizationMixed text/attachments/mediaText retained; media limitations clearly warned; binaries not claimedN-06NormalizationMalicious URL `javascript:` / spoofed chat URLNo enabled unsafe source linkS-01SearchAND/OR/NOT truth-table combinatoricsExact hit IDs/counts match independent oracleS-02Search`a OR b AND NOT c` + parenthesesCorrect precedence and groupingS-03SearchSame-message vs anywhere-in-chat terms in separate messagesCorrect disagreement between scopesS-04SearchQuoted phrase/escaped quote/backslash/colonCorrect literal behavior, errors only for unsupported syntaxS-05SearchNegative-only and title-only matchesConsistent zero-occurrence explanation, no fabricated hit offsetsS-06SearchRole, inclusive UTC date boundaries, undated messagesExact expected inclusion; no local timezone bleedS-07SearchActive/all branches + shared ancestorCorrect counts and message IDsS-08Search4,096 characters / 256 tokens / 32 nesting levelsCorrect boundary and error behaviorS-09SearchUnicode, case, emoji, RTL, combining accentsDocumented literal/case behavior, offsets point to correct textS-10Search25k messages with filter and 1k selected chatsNo silent cap, deterministic ordering and bounded workX-01SelectionSelect all results after sort/filter, first/last NExact expected IDs, no duplicatesX-02SelectionChange filter, reload, change branchPersist only documented state; no phantom selectionA-01AnalyticsEmpty/zero chats and missing timestampsUnknown represented as `null` where appropriateA-02AnalyticsTwo unequal chat sizes, all roles, Unicode wordsBoth average definitions and counts independently verifiedE-01ExportTXT/JSON/CSV/HTML × conversations/statistics × active/allEvery supported combination parses correctlyE-02ExportSearch matches subset, export selected conversationAll branch-policy messages included, not just search hitsE-03ExportHTML with script-like title/body and malicious URLEscaped, inert in browser with restrictive CSPE-04ExportCSV cells `=`, `+`, `-`, `@`, tabs, CR/LF, quotesFormula protection and RFC4180 quoting verifiedE-05ExportManifest body, SHA-256, source/query fingerprintsIndependently recomputed checksum and counts matchE-06Export1,000 chats, long text, file errorsDownload completes without truncation; errors recoverableD-01StorageFirst import → save → close/reopen extensionSame IDs, text, warnings, branch policy recover correctlyD-02StorageInvalid reimport or aborted write/quotaPrevious snapshot remains intact and searchableD-03StorageClear data, reopen, second tabSnapshot removed, tabs synchronized, original export untouchedD-04StorageCorrupted IndexedDB entry or version issueClear recovery path without infinite crash loopW-01WorkerRapid import/search/export/clear requestsSerialized, responses correlated to request IDs, no stale UIW-02WorkerWorker termination/reload during importNo partially committed dataset; UI recoversU-01E2EFirst-run synthetic demo → search → viewer → stats → exportAll labels, counts, generated files correctU-02E2EReal installed MV3 extension (not preview)CSP, worker, storage, action-click, full workflow passU-03E2EKeyboard-only dialogs, search, navigation, downloadFocus visible, Esc/close/reopen and focus returnU-04E2E320/390/768/1024/1440px, both themes, reduced motionNo clipped actions or document overflow; accessible statesU-05E2EImport errors, query errors, quota errorsUser can recover and continue without refresh/data lossU-06E2ELong titles/URLs and HTML-like user textSafe rendering and no page script executionP-01Packaging`npm run build`, actual ZIP and SHA-256ZIP checksum matches and contains installable manifest/assetsP-02PackagingVersion consistency and third-party MIT noticeManifest/npm/tag/release agree; `THIRD_PARTY_NOTICES` completeP-03PackagingPermission/CSP regressionNo unexpected permissions, host access, analytics, remote codeP-04CIFresh Windows and Linux `npm ci && npm run test:all`All steps green on exact release SHA; full tests executedR-01Real dataGenuine official export held locally onlyComplete core workflow works; only metadata counts/results recordedR-02Real dataSecond independently generated export variant if availableCompatibility and warnings checked; no raw content disclosed**Further tests to add when justified by bugs:** property-based Boolean expression evaluation against an independent pure oracle; adversarial ZIP fuzzing with fixed seeds; fault injection for worker crashes and storage writes; reproducible package hash across fresh environments with consistent timestamp controls; deterministic performance smoke tests. Don't make a fuzzer or huge performance suite a hard gate without defining resource budgets first.

### 6.3 Executable test commands
**On Windows PowerShell (from reviewed implementation checkout):**

```
node --version                 # Node 24 recommended
npm ci                         # Must succeed with integrity checks enabled
npx playwright install chromium
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run build
npm run test:e2e
npm run test:all                # Canonical complete gate
# Private, opt-in, not suitable for CI:
$env:CHATFLOW_REAL_EXPORT = 'C:\secure\actual-export.zip'
npm run test:real
Remove-Item Env:\CHATFLOW_REAL_EXPORT
```
**On macOS/Linux:**

```
node --version
npm ci
npx playwright install chromium
npm run test:all
# Optional private local compatibility check, never in public CI:
CHATFLOW_REAL_EXPORT=/private/path/to/actual-export.zip npm run test:real
```
`test:all` already includes typechecking, lint, formatting, coverage, build and E2E. Standalone commands above help isolate failures. Use a *clean working directory, clean npm cache or a documented trusted cache, separate Chrome profile and free test port*. Do not claim Linux/macOS extension production compatibility beyond what is actually tested; MV3 product target is Chromium. CI success on an OS means build/tests passed there, **not** that every installed browser on that OS was tested.

## 7. CI, packaging, dependency and security controls
**CI release workflow (recommended):** `checkout` pinned SHA → Node 24 → `npm ci` (strict) → Chromium install → `npm run test:all` → upload **synthetic-only** test artifacts and build ZIP/checksum → automated SBOM/dependency/license check if maintained → tag workflow built from matching commit → draft GitHub Release (only upon approved publishing workflow). Keep GitHub token `contents: read` for test jobs; write permissions only on explicit approved release job. Avoid mutable `latest` dependencies/action tags.

`EINTEGRITY`** investigation playbook:** preserve log and lockfile; compare integrity field and expected tarball with authoritative package metadata; determine whether a proxy/cache returned unexpected bytes or upstream package changed; verify from clean trusted network/cache and OS; document evidence; resolve by trustworthy pin/version or corrected, reviewed lockfile **only after provenance is established**. Never hide failure with `--force`, `--legacy-peer-deps`, `--ignore-scripts`, disabled integrity checks, or test skips presented as a fix. `--ignore-scripts` is not a checksum remedy and may alter legitimate install behavior.

**Privacy/security controls:** no remote analytics or external code; offline installed CSP with `connect-src 'none'`; package permissions and runtime network checks; HTML escapes; CSV formula defense; ZIP safety budgets; source-link host/path/ID verification; profile-local **unencrypted** IndexedDB disclosure; export confirmation; no personal export or sensitive metadata in screenshots, CI, issues, release artifacts or public logs; real-data test should record only safe counts/outcome and package version, not chat text.

**Browser-store note:** Chrome Web Store policy updates effective in 2026 emphasize single-purpose extension behavior, disclosure and non-circumvention of AI service safeguards. Re-check policies when/if submitting; do not equate GitHub Release with store approval. Official reference: [https://developer.chrome.com/blog/cws-policy-updates-2026](https://developer.chrome.com/blog/cws-policy-updates-2026).

## 8. Documentation and GitHub presentation
ResourceActionRequired content`README.md`RewriteHero, screenshots/GIF, 60-second start, clear status, truthful features, install, privacy, limits, license`docs/QUICKSTART.md`CreateEnd-user ZIP install and first-run demo; clean-build dev alternative`docs/TESTING.md`ExpandComplete command matrix, real/private test guidance, known CI requirements, reproducible fixtures`docs/ARCHITECTURE.md`CreateData flow, module boundaries, worker and IndexedDB, threat model, package/distribution lifecycle`docs/PRIVACY.md`CreateWhat stays local, IndexedDB at-rest warning, sharing/export behavior, no account access`docs/KNOWN_LIMITATIONS.md`CreateOffline snapshot, unsupported attachments, branching semantics, no sync, import quotas, single snapshot`docs/FAQ.md` / `docs/TROUBLESHOOTING.md`Create/updateExport instructions, malformed ZIP, quota, reinstall, no-results explanations, unsupported browser`docs/RELEASE.md`CreateTagged build, checksum verification, rollback, optional store checklist`CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` / `SECURITY.md`CreateContribution process, issue/report handling, responsible disclosure`LICENSE` and `THIRD_PARTY_NOTICES.txt`Decide/verifyProject license; dependency license in distribution`CHANGELOG.md`CreateReleased capabilities, fixed bugs, clear limitations and version policy`.github/ISSUE_TEMPLATE/*`, `pull_request_template.md`CreateReproducible reports that never request raw private chat exports`.github/workflows/ci.yml`Fix/extendGreen clean installs and full matrix, minimal token privilegesGitHub settingsConfigure manuallyPublic state (owner-approved), canonical default branch, repo description, topics, social preview, protected release branch, release assets**Suggested GitHub short description:** “Local-first Chromium extension to search, analyze and export official ChatGPT conversation archives. Private by design.”

**Suggested topics:** `typescript`, `browser-extension`, `manifest-v3`, `chatgpt-export`, `offline-first`, `privacy`, `search`, `data-export`, `open-source` (after appropriate license/publication).

**README order:** image → short value proposition → what it does → privacy limits → 60-second demo → install packaged ZIP → developer commands → architecture link → test status → release limitations → contributing/license. Use **only synthetic data** for media and issue reproduction.

**GitHub setup may require owner interaction:** private→public conversion, default branch switch, rulesets, release publication, Pages, Chrome Web Store enrollment, organization permissions, signature keys. These are **not** tasks a coding agent may perform implicitly.

## 9. Demo and LinkedIn launch assets
**60–90 second demo script (synthetic conversations only):**

1. Show GitHub README and installed MV3 extension, not a mocked web preview.
2. Select **Try synthetic demo**; show four clearly labeled sample conversations.
3. Query `(migration OR search) AND NOT draft` and then an exact phrase; show message-level hits.
4. Open a conversation, navigate next/previous hit, toggle active/all branches.
5. Select matching chats, inspect aggregate statistics, export JSON or HTML ZIP.
6. Unzip and verify SHA-256 manifest, demonstrate offline state and clear-local-data action.
7. End on verified release link and exact scope: “official exports; no account connection.”
**Assets:** 1 hero screenshot (1440px), 1 short demo GIF or MP4, 2 supporting views (search result and export confirmation), 1 concise architecture diagram, 1 screenshot of current green CI for the exact SHA (not fabricated), release ZIP and checksum, changelog.

**Suggested LinkedIn post (only after GO):**

> I built **MOORKYZ ChatFlow**, a free, open-source, local-first Chromium extension for exploring official ChatGPT conversation exports. It handles conversation branches, exact and Boolean search, detailed statistics, and exportable ZIP bundles with checksums — without connecting to your ChatGPT account or uploading your archive. The interesting challenges were not the UI alone: validating untrusted ZIPs, preserving conversation graphs, keeping IndexedDB updates atomic, and proving the shipped extension works with repeatable browser tests. Source, technical notes and a synthetic demo: [approved public release link].
Don't post unsupported benchmarks, personal screenshots, or “all chats recovered” claims. Ask for actionable compatibility feedback; track issues rather than pretending complete universal schema coverage.

## 10. Phase dependencies, gates, and estimates
PhasePriorityEstimated effort*Depends onExit gate0. Baseline/branch/CI/licenseP00.5–2 daysOwner license/default-branch decisionsNo ambiguous canonical code, integrity issue resolved1. Import/search/export correctnessP02–4 daysPhase 0Core deterministic tests pass2. UX/AccessibilityP0/P13–6 daysPhase 1E2E first-run and keyboard flows pass3. CI/Security/packagingP02–4 daysPhases 1–2Clean Windows/Linux CI, security gates pass4. Docs/GitHub presentationP0/P12–3 daysAccurate implementationFresh clone instructions and packaging pass5. Independent audit/launchP01–2 daysPhases 0–4Independent GO + owner approval*Rough engineering-only estimates, dependent on investigating the actual dependency-integrity failure and discovered defects; **not** a delivery commitment. Parallelize independent tests/docs only after core branch/release decisions. Stop if an integrity/security issue cannot be resolved.

**Stop/NO-GO conditions:** unknown lockfile provenance or continued `EINTEGRITY`; real data committed/published; privacy-claim mismatch; HTML/script injection; lost snapshots on failed imports; phantom/incorrect exported data; failures in exact candidate CI; missing approved license; unapproved branch/history changes; installable ZIP cannot be loaded; unreviewed third-party dependencies.

## 11. Master implementation prompt for a coding agent
Copy this entire block into a capable coding agent with access to the **local repository clone**; provide this roadmap and the companion independent assessment as context. This is an **implementation task**, not permission to publish anything.

```
ROLE: Lead TypeScript/browser-extension engineer and security-conscious release maintainer.
TARGET: Moorky/moorkyz-chatflow, specifically the reviewed implementation derived
from recovery/verified-20261103 (SHA 1db2d49389fbd123432edd0ff0a8c38823189240).
Confirm current refs, SHAs, repository configuration and worktree before modifying.

MISSION:
Turn the EXISTING local-first, offline Chromium MV3 ChatGPT-export explorer into a
finished, user-friendly, reproducibly tested open-source portfolio product.
Preserve current import, graph/branch semantics, Boolean search, stats, export,
IndexedDB, privacy and zero-host-permission design. Fix correctness, UX, CI,
security, docs, packaging and GitHub presentation gaps. Implement only the
clearly specified product release scope; don't expand into live-account access,
scraping, cloud sync, attachment fetching, AI analysis, or monetization.

HARD RULES:
1. Never force-push, reset, delete or rewrite original/unrelated histories.
   Master and implementation branch have documented divergent histories.
   Before ANY default-branch/public-visibility/licensing decision, present a
   safe option plan and obtain EXPLICIT owner approval; preserve old refs.
2. Never upload, log, commit, screenshot or share genuine conversation exports,
   secrets, tokens, or other private chat content. Use synthetic test fixtures.
3. Do not bypass npm package integrity checks. Investigate the demonstrated
   yocto-queue@1.0.0 EINTEGRITY failure on both CI platforms and record root
   cause. Do not blindly rewrite hashes or ignore CI failure.
4. Do not claim a green test, cross-platform compatibility, independent audit,
   privacy guarantee, Web Store approval or finished feature without evidence.
5. Maintain no remote/host account permissions, offline processing and honest
   unencrypted-at-rest IndexedDB disclosure.
6. No direct ChatGPT API mutation/scraping, no hidden service integration.
7. Keep changes reviewable: one focused feature/fix per commit/PR, associated
   tests and documentation; maintain an immutable audit of changes and commands.
8. Version and LICENSE must be approved; package 1.0.0 labels do not prove release.
9. DO NOT publish GitHub Release, switch repo public, alter GitHub default branch
   or publish Chrome Web Store listing without explicit separate human approval.

EXECUTION ORDER:
A. Inventory actual code, branch divergence, untracked/private files, CI and
   licenses; compare to roadmap. Write an evidence-backed task plan with P0/P1/P2.
B. Fix dependency integrity and verify clean npm ci Windows/Linux; obtain
   license/default-branch decisions when required. Do not continue to release
   while blocked, but continue safe independent local tasks if possible.
C. Implement/refine importer, normalization, search, export, storage and worker
   regressions with independently computed expected outcomes. No data loss.
D. Polish onboarding/search/viewer/selection/export UX with semantic accessibility,
   responsive breakpoints, light/dark and reduced-motion behavior. No dead controls.
E. Extend tests, include installed real MV3 extension, browser privacy,
   adversarial fixtures, stress/failure injection and fresh-clone packaging.
F. Update README, documentation, GitHub configuration files, demo assets using
   ONLY synthetic data. Produce an installable ZIP/checksum from exact candidate.
G. Run all local and remote required tests, compare result to independently
   specified test assertions, and prepare release-candidate audit handoff.

MANDATORY TEST GATE (Node 24 recommended):
  npm ci
  npx playwright install chromium
  npm run typecheck
  npm run lint
  npm run format:check
  npm run test:coverage
  npm run build
  npm run test:e2e
  npm run test:all
Also confirm clean Windows/Linux GitHub Actions on the *exact release SHA*.
Run separate opt-in real-export compatibility check only with owner-provided
PRIVATE local data; never store the content in test artifacts or reports.

FOR EACH TASK DELIVER:
- Task ID, files changed, rationale and previously observed failing behavior.
- Tests added/updated with explicit expected outcomes.
- Command/output evidence, including failures and unresolved limitations.
- Security/data-loss impact and rollback approach.
- Documentation changes; link to exact commit and any PR.
- Refuse to mark complete when critical test evidence is missing.

FINAL OUTPUT:
1. Feature inventory (implemented / unsupported / deferred).
2. Artifact manifest with SHA-256 + exact source commit.
3. Test matrix pass/fail/not-run counts, evidence links and known gaps.
4. Release blockers with severity and corrective tasks.
5. Recommendation for independent release auditor, WITHOUT self-approval.
6. Explicit list of owner-only GitHub/Chrome Web Store actions still required.
Use MOORKYZ_ChatFlow_Final_Release_Assessment_EN.md for independent GO/NO-GO.
```

## 12. Evidence required for independent assessment
Provide to the independent assessor: exact candidate SHA and branch; test environment versions/OS; clean install logs; GitHub Actions run URLs; test/coverage summaries; deterministic fixture expectations; MV3 ZIP + SHA-256 manifest; package diff; source secret/license scan result; screenshot/video from **synthetic** fixture only; accessibility report; real-export test **metadata-only** summary; release documentation and the explicit list of unimplemented features. Have the independent assessor issue separate **Portfolio Public**, **GitHub Stable Release**, and **Chrome Web Store** verdicts. The owner's approval remains mandatory.

---

### Official external documentation (verify current versions during implementation)

- GitHub default branch management: [https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/changing-the-default-branch](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/changing-the-default-branch)
- GitHub repository rulesets: [https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository)
- Chrome Web Store developer policies / 2026 update: [https://developer.chrome.com/blog/cws-policy-updates-2026](https://developer.chrome.com/blog/cws-policy-updates-2026)
- Chrome Web Store publishing: [https://developer.chrome.com/docs/webstore](https://developer.chrome.com/docs/webstore)
**End of implementation roadmap.**