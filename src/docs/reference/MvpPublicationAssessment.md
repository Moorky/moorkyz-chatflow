# MOORKYZ ChatFlow — Independent MVP Publication Readiness Assessment
**Purpose:** final independent GO / CONDITIONAL GO / NO-GO review of the *focused offline Chromium-extension MVP*, not the full V5 specification.
**Repository:** [Moorky/moorkyz-chatflow](https://github.com/Moorky/moorkyz-chatflow)
**Assessment template created:** 2026-11-08
**Auditor:** independent of the implementing agent
**Scope:** actual final source commit + packaged extension, not just README claims.
**State:** **NOT ASSESSED** — this template does not represent a successful audit.

## 1. Release decisions — separate them
Publication targetAllowed decisionsRequired interpretationPublic GitHub **portfolio** repositoryGO / CONDITIONAL GO / NO-GOCan show unfinished but clearly labelled work only if privacy, licensing and truthful documentation gates pass.GitHub **stable MVP release**GO / NO-GOMust pass all mandatory functional, safety, installation and CI gates; never use conditional as a stable release.LinkedIn **finished-MVP announcement**GO / NO-GOOnly after stable release is verified and owner approves public claims.Chrome Web Store submissionSeparate GO / NO-GOOptional and deferred. Do not claim approval without real store approval.**Current known blocker baseline:** `master` is README-only, implementation lives at `recovery/verified-20261103`, repo private, project license undecided, no GitHub release, and [GitHub Actions run 41548671682](https://github.com/Moorky/moorkyz-chatflow/actions/runs/41548671682) failed `npm ci` (`EINTEGRITY`). **Recheck current state before judging**, because it may have changed since the template was written.

## 2. Audit protocol

1. Check out the exact proposed release SHA in a fresh clone. Record branch, SHA, tag, OS, Node, npm, browser version and timestamp.
2. Inspect manifest, dependencies, license, threat model, tracked history and distributable archive, not only latest README.
3. Execute the commands below; capture exit codes, OS matrix and CI run URLs. If a prerequisite fails, downstream checks are **NOT RUN**, never PASS.
4. Independently design expected results for tests. Do not simply trust snapshots/fixtures authored by the implementation agent.
5. Install the actual release ZIP/unpacked MV3 extension in a fresh browser profile and perform the end-to-end acceptance path.
6. Validate real official export only in the user's local environment; do not transmit private content or logs.
7. Create a finding for every failure, classify impact/severity, record a precise reproduction, and retest after changes.
8. Audit release packaging, documentation and GitHub/LinkedIn claims against verified behavior.
9. Record independent verdict per target. **Only the owner** authorizes public visibility, default-branch changes, tagging, release or announcement.

### Evidence identifiers
Use e.g. `EV-CI-01`, `EV-IMPORT-02`, `EV-E2E-01`. Each links to a commit-specific log, test result, screenshot with synthetic data, report or GitHub Actions run. Do not link to unpublished private user data.

## 3. Hard release gates
Check each item only after gathering evidence. `Not applicable` must be justified.

### G0 — Repository and reproducible build

- Default release branch contains executable source, real tests and docs (not README only).
- Old divergent branches/history were preserved; no unreviewed force push/reset or sensitive-data exposure.
- `npm ci` passes on clean Windows and Linux environments with trusted, reviewed package integrity metadata.
- Prior `yocto-queue@1.0.0` EINTEGRITY failure has a documented, verified resolution; checks are **not** bypassed.
- `npm run test:all` finishes successfully on the candidate SHA and CI reports green for supported OSes.
- Node/browser/system support matrix matches reality; fresh clone succeeds without undocumented local files.

### G1 — Core product: import, search, library

- ZIP and JSON official-export-shaped imports work and show precise source counts.
- Failed imports and storage-quota failures preserve the last committed local snapshot.
- Query logic (AND/OR/NOT/parentheses/phrases/scope) produces independently expected IDs and occurrences.
- Active-branch vs all-branches selection is correct and clearly labelled; shared ancestors are not double-counted.
- Message viewer opens true matching message and displays context; pagination has no silent data-loss side effects.
- Search results, roles, dates, source/missing metadata and unknown counts are clearly distinguished.

### G2 — Selection, statistics, export and storage

- First/last/individual/all-results selection matches documented semantics beyond first rendered page.
- Statistical denominators, zero/unknown values and branch policies match independently calculated expected values.
- TXT/JSON/CSV/HTML export outputs and statistics formats are correct and complete for selected chats.
- Export ZIP manifest source/query fingerprints, SHA-256s, sizes and selection counts recompute correctly using an independent implementation.
- HTML, CSV and displayed untrusted source content cannot execute injected source input.
- Reload restores the saved snapshot; clear removes the local copy and updates other tabs, without modifying user's source archive.
- Media/attachment omissions and partial export limitations are reported honestly.

### G3 — Security, privacy, robustness

- Actual packaged MV3 manifest requests no host/network/account permissions and does not contain content scripts or remote code; check actual bundle and runtime.
- Actual extension CSP and browser monitoring confirm no unauthorized external connections/telemetry for core workflows.
- Import and ZIP limits, malformed archives, path traversal, duplicate entries, CRC errors, decompression bombs and unsupported ZIP variants are handled safely.
- Untrusted messages/titles are rendered inert; export escapes HTML and protects CSV formulas according to documented semantics.
- IndexedDB unencrypted persistence is disclosed; clear behavior is correct but not marketed as forensic secure erase.
- Error and exception handling avoids sensitive message dumps and resource exhaustion where supported.
- No secrets, private exports or real conversations are present in Git history, release ZIP, screenshots, CI artifacts or public demo.
- Independent threat-oriented review recorded any unaddressed issues and severity.

### G4 — UX and accessibility

- First-run synthetic demo is clearly labelled; normal user can import/search/view/export with no code knowledge.
- Advanced search functions remain usable and are not accidentally removed by UI simplification.
- Loading/progress/error states are non-misleading, keyboard-accessible and actionable.
- Focus/labels/Escape/dialog flows work; status announcements readable by assistive tech.
- 320/390/768/1024/1440px layouts work, including dark mode, 200% zoom and reduced motion as applicable.
- Automated accessibility check for import/search/view/export/clear plus documented manual keyboard and screen-reader spot check.

### G5 — GitHub, license and launch

- Owner-approved project LICENSE and copyright metadata are consistent in README/package/release; third-party MIT notices preserved.
- README matches actual offline capability, installation and limitations; no live ChatGPT account claims or false completion claims.
- Quickstart works from fresh clone; broken links, missing assets and inaccurate commands are fixed.
- GitHub description/topics/preview/demo use only synthetic data, independent-of-OpenAI branding disclosure is prominent.
- Artifact ZIP SHA-256 verified, manifest version matches release, installed extension functions offline.
- Version, tag, changelog and release notes agree; no Chrome Web Store approval claim without real approval.
- Owner explicitly authorizes each remote/publication action.
**Stable-release NO-GO conditions:** any critical/high security issue; known data-loss defect; failed or unrun required CI/build/packaging E2E; misleading core claim; absent/unclear license; missing executable source in default branch; actual ZIP not independently installed/tested; unreviewed exposure of private data.

## 4. Required independent behavior matrix
IDTest design / fixtureObjective expected evidencePriorityT01Synthetic official-style JSON, single valid chatExact expected chat/message counts and message IDsBlockerT02ZIP with numbered `conversations-N.json` segmentsAll segments imported once in stable orderBlockerT03Truncated/bad JSON, bad UTF-8, missing mappingExplicit error; old snapshot unchangedBlockerT04Duplicate conversation/message IDs and cycles/invalid graph parentsReject input; no silently omitted materialBlockerT05Encrypted, ZIP64, multidisk, path traversal, duplicate ZIP entries, forged CRCReject safely; no filesystem mutationBlockerT06ZIP-bomb and input/expanded/entry-count limitsBounded processing; clear failure; previous data intactBlockerT07Empty query and phrase/exact substring casesDefined fixture counts; not fabricated hitsBlockerT08Boolean truth table: A AND B, A OR B, NOT A, parentheses, precedenceCorrect chat/message witnesses per scopeBlockerT09Same-message vs anywhere-in-chat with A/B on different messagesScope determines inclusion correctlyBlockerT10Role/date/title and selected-chat scope; missing timestampsCorrect filtering and unknown handlingBlockerT11Branch graph: regenerated answers / shared ancestor / absent active pathExact active/all message counts; warnings when unknownBlockerT12Search match navigation, context, pagination, negative-only logicCorrect message IDs, no duplicate or omitted hitsBlockerT13First/last N, multi-select, more than page-size chats, query changesDeterministic selection and no hidden truncationBlockerT14Zero-message and mixed-size chats, Unicode, roles, null timestampsIndependently calculated words/counts/averagesBlockerT15Eight existing combined conversation/statistics format permutationsContent/format/coverage match selection and branchingBlockerT16Manifest in exported ZIP, recomputed SHA-256 and source/query identifiersHashes/sizes/counts match independent crypto implementationBlockerT17Hostile title/message (`<script>`, quotes, CSV formulas, control chars)Inert UI/HTML/CSV; no executable codeBlockerT18IndexedDB aborted transaction and exceeded quotaAtomic rollback to last known-good snapshotBlockerT19Reload, corrupted local snapshot, clear in two tabsCorrect restore/error/clear; original source untouchedBlockerT20Actual Chrome MV3 package in fresh profile, offline modeImport → find → view → select → export → reload → clear passesBlockerT21Built ZIP, assets/manifest/permissions/CSP/notices/checksumVerifiable release bundle; no network permissionsBlockerT22UI on 320/390/768/1024/1440 px + keyboard/dark/reduced motionNo critical overflow, focus trap or unusable controlMajorT23Stress 1/100/3,000/10,000/25,000 messages + 1,000 selected chatsBounded operation, factual memory/latency report, no silent truncationMajorT24Real official export on owner machine using `CHATFLOW_REAL_EXPORT`Critical workflow passes privately, or marked NOT RUN with truthful limitationStable claim gateT25Clean Windows + Ubuntu clone, exact release SHAInstall, full CI, packaged extension smoke workBlocker**Tests already in the project:** `tests/unit`, `tests/integration`, `tests/e2e`, `tests/real`. Do not blindly add duplicates; auditor must confirm the assertions cover these invariants and introduce independently authored counterexamples for any untested gap. Tests that merely assert the UI element exists do not establish correct behavior.

### Failure injection beyond routine happy paths

- Missing/corrupt local snapshot; browser storage quota; aborted IndexedDB upgrade/write; simultaneous tabs; browser killed during import; stale pending worker response; malformed ZIP central directory; CPU/memory pressure; download cancel/failure; injected UI strings; path and file extensions in ZIP entry names.
- Check no user-source mutation, no leakage, and a recoverable UX after failure.
- Document cases not practicable to automate (e.g. storage eviction, real OS crash) and provide manual procedures. Do not mark them passed because tests for adjacent behavior passed.

## 5. Reproducible release verification commands
Run in a new directory with a **clean clone of the candidate branch**:

```
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
Capture exit codes, OS/browser versions, commit SHA, logs, test counts and coverage summary. `npm run test:all` duplicates the constituent suite but is useful as the final single gate. Do not run an untrusted downloaded test script against a personal browser profile or real private data.

Optional private real-export rehearsal, on owner's device only:

```
$env:CHATFLOW_REAL_EXPORT = 'C:\private\official-export.zip'
npm run test:real
Remove-Item Env:CHATFLOW_REAL_EXPORT
```
Review that trace/video/screenshot capture is disabled, test outputs do not contain real text, and no sensitive file path enters public evidence. **NOT RUN is a legitimate honest outcome; falsely claiming real-data compatibility is not.**

## 6. Issue severities and decisions
SeverityExampleRelease impactCriticalPrivate export exfiltrated, original data overwritten, executable injection, loss of committed snapshotImmediate NO-GOHighCore import/search/export produces incorrect or missing data without warning; CI/build unavailable; release license absentNO-GOMediumNoncritical keyboard defect, confusing feedback, platform-specific non-core issue with documented workaroundFix or document with explicit reviewer acceptanceLowCosmetic spacing, optional convenienceBacklog if it does not mislead or block core useUse **CONDITIONAL GO only for making a plainly labelled public work-in-progress portfolio**, never for a claimed stable finished MVP.

## 7. Required final audit report format

```
# Independent ChatFlow Release Assessment
Date/time:
Auditor:
Repository URL:
Candidate branch/tag/SHA:
Runtime OS/Node/npm/Chromium:

## Verdicts
- Public GitHub portfolio: GO / CONDITIONAL GO / NO-GO
- Stable GitHub MVP release: GO / NO-GO
- LinkedIn finished-MVP announcement: GO / NO-GO
- Chrome Web Store: NOT IN SCOPE / GO / NO-GO

## Gate results
| Gate | PASS / FAIL / NOT RUN / N/A | Evidence ID / link | Notes |
|---|---|---|---|
| G0 | | | |
| G1 | | | |
| G2 | | | |
| G3 | | | |
| G4 | | | |
| G5 | | | |

## Tests and environments
| Command / test | Exact result | SHA | Evidence |
|---|---|---|---|

## Findings (severity ordered)
- ID / severity / reproduction / user impact / fix / verification:

## Private real-export compatibility
- PASS / FAIL / NOT RUN; no sensitive details or path in public report:

## Scope and truthfulness
- Confirmed MVP capabilities:
- Explicitly deferred capabilities:
- Public claims corrected/removed:

## Owner decisions outstanding
- License/copyright:
- Default branch:
- Public visibility:
- Tag/release:
- LinkedIn post:

## Final rationale
- Why this does/does not meet the evidence-based MVP release bar:
```

## 8. Independent auditor AI prompt (copy/paste)

```
Act as an independent release auditor for MOORKYZ ChatFlow. You are NOT the
implementation agent. Audit the focused MVP roadmap against the exact final
release candidate code and actual built MV3 package. Do not assume a task is
complete because the implementation agent marked it complete.

Start by inspecting GitHub and local branch state, particularly the historical
README-only master versus recovery/verified-20261103, and document the exact
final SHA. Check source/manifest/licensing/CI/release artifacts. Use a fresh
clone, clean install, and independent synthetic fixtures. Review the existing
tests for substance and add precise counterexamples only if needed.

Run npm ci, typecheck, lint, format, coverage, build, browser E2E and the
combined test:all suite on supported Windows and Linux environments. Read
failures; do not bypass lockfile or certificate integrity. Install the real
unpacked extension and test import, query, branching, selection, statistics,
export ZIP content/checksum, reload and clear. Verify privacy and security
boundaries and record accessibility/usability observations.

For any legitimate real official export, test only locally under
CHATFLOW_REAL_EXPORT; never send it to a model/provider, include its contents
in a report or publish its trace. If unavailable, explicitly mark NOT RUN.

Classify critical/high/medium/low defects, fix only if separately authorized
as an auditor, and always rerun relevant tests after changes. Do not invent
passing results or claim that synthetic fixtures prove compatibility with all
ChatGPT account exports.

Deliver the completed evidence-based assessment using the report template and
separate GO/CONDITIONAL GO/NO-GO decisions for public portfolio, stable GitHub
MVP and LinkedIn. Chrome Web Store is optional and independently gated.
Never push, tag, change visibility/default branch, publish releases or post to
social media without owner approval.
```

---

*This is an evaluation protocol, not an evaluated result. Source baseline: connected GitHub inspection of Moorky/moorkyz-chatflow on 2026-11-08.*