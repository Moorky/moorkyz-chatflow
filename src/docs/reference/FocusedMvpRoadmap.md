# MOORKYZ ChatFlow — Focused Portfolio MVP Roadmap
**Document type:** implementation roadmap + coding-agent master prompt
**Repository:** [Moorky/moorkyz-chatflow](https://github.com/Moorky/moorkyz-chatflow)
**Assessment date:** 2026-11-08
**Target:** finished, demonstrable, privacy-conscious, locally running Chromium extension; **not** a feature-complete ChatGPT account manager.
**Status:** Plan only. No work or testing described in this document has been performed by this plan.

## 1. Executive decision
**Ship a small, complete product.** Import official ChatGPT exports, search and inspect conversations, select and analyze them, export chosen conversations, and clear local data. The implementation already exists on `recovery/verified-20261103`. Fix release blockers, simplify its user journey, verify behavior using independent test fixtures, and present it honestly.

**Do not implement the complete V5 product specification** or build live ChatGPT integration for this release. The full roadmap remains future backlog and must not block an honest portfolio MVP.

### MVP value proposition

> Explore and export your ChatGPT conversation history locally, without uploading your archive to another service.
*This describes locally imported official export files, not live account sync, guaranteed full backups, or preservation of multimedia attachments.*

### Existing code baseline (verified via connected GitHub repository)
FactEvidenceDefault `master` holds **only a README** at `6956b957`; full product lives on `recovery/verified-20261103` at `1db2d493`GitHub branch treesRepository is **private** and has **no published GitHub release**GitHub repository/release metadataProduct branch contains a Manifest V3 Chromium extension and TypeScript implementation`public/manifest.json`, `src/`, `vite.config.ts`It already has JSON/ZIP import, normalization, Boolean search, statistics, selected export, IndexedDB, synthetic demo, packaging and test suites`src/importer/`, `src/search/`, `src/analytics/`, `src/exports/`, `src/storage/`, `src/ui/demo.ts`, `tests/`CI on that branch failed on both Ubuntu and Windows **before executing tests**[Actions run 41548671682](https://github.com/Moorky/moorkyz-chatflow/actions/runs/41548671682)Failure was `npm ci` with **EINTEGRITY** mismatch for `yocto-queue@1.0.0`CI job logs; investigate causes before changing hashesNo approved project-level open-source license is present on implementation branch; README says license remains an owner decisionImplementation branch tree and READMECurrent package/extension manifest calls itself `1.0.0`, but README describes an **offline foundation**, not a full V5 or store-approved product`package.json`, `public/manifest.json`, `README.md`Tests and documentation claim 95% V8 coverage for non-UI TypeScript; **that does not establish current CI success**`vitest.config.ts`, `docs/TESTING.md`**Important:** Baseline is tied to the above commit SHAs. Reinspect HEAD and actual local/remote state at implementation start. No source data from private accounts belongs in public tests, screenshots, issues or AI prompts.

## 2. In scope / out of scope

### Required MVP — preserve, polish, prove

- **Import:** official ChatGPT export ZIP and supported JSON; explicit supported format/size limitations, resilient malformed-input errors, import progress and atomic replacement.
- **Library:** browse conversations and messages, inspect context and active/all branch choice, usable empty/loading/error states.
- **Search:** existing terms, phrases, AND/OR/NOT, title/message scope, role and date filters; accurate hit counts and links to actual source messages.
- **Selection and statistics:** predictable select/deselect, first/last N where already supported, clear counts and denominators, branch-aware statistics.
- **Export:** selected conversations/statistics in formats currently supported (TXT/JSON/CSV/HTML), download ZIP with validated SHA-256 manifest, clear disclaimer that attachments and unsupported source data are omitted.
- **Local privacy:** no host/network permissions, no live API or scraping, no analytics, explicit unencrypted IndexedDB retention and reliable local clear.
- **Accessibility and UX:** understandable default workflow, keyboard navigation, visible status/feedback, responsive light/dark and reduced-motion behavior.
- **Distribution:** verified unpacked extension and an integrity-checked downloadable GitHub release asset, accurate README and licensing.

### Explicitly deferred (never required for MVP completion)

- Directly move, rename, delete, archive or lock conversations inside a live ChatGPT account.
- Automatic account synchronization, browser scraping, undocumented APIs, extension content scripts or permission expansion.
- Semantic/fuzzy AI search, embeddings, agent functionality, model APIs, automatic cloud uploads.
- PDF as a native export format; advanced multi-file/time-split exports; first/last-N **message** export.
- Attachment binary extraction or complete multimodal archive preservation.
- Saved custom searches/sets, broad timezone controls, comprehensive ChatGPT V5 specification.
- Mobile browsers, Chrome Web Store acceptance, Firefox/Safari ports, multiuser service or hosted SaaS.
**Exception:** Fix defects that invalidate a core MVP claim even if they are discovered outside a listed task.

## 3. Target user experience: exactly one primary workflow

1. **Open** extension; clear call to action: `Try demo` or `Import ChatGPT export`.
2. **Import** locally; show supported file formats, size limits, progress, error explanations and replace-existing warning.
3. **Find** conversations via one primary search field; advanced filters collapsed by default; display match counts and coverage clearly.
4. **Review** hits in full message context; branch toggle visibly explains what changes.
5. **Select** conversations and see selected total persist across filters as currently intended.
6. **Inspect** statistics or **Export** full selected chats with explicit confirmation of source coverage and omitted attachments.
7. **Clear** saved local snapshot with a confirmation dialog and immediate feedback; the original export/downloads remain unchanged.
No unexplained technical controls in the default view. Keep advanced search/filter behaviors accessible, not removed.

### Specific UX refinements

- Strong default hierarchy: import/search/results/selected/export. Avoid multiple equally prominent actions.
- Use progressive disclosure for Boolean help, search scope, branching and advanced filters.
- Explain `matching chats`, `matching messages` and `literal occurrences` separately.
- Explain difference between **same message** and **anywhere in conversation**, and between **active branch** and **all branches**.
- A no-results state must report source, filters, branch policy and whether data was imported; avoid interpreting no results as no historical information.
- On import failure, show `Previous local library was preserved` only when verified by implementation behavior.
- On storage quota, corrupted snapshot or export failure, offer recovery instructions without silently deleting user data.
- Announce long-running work via status region, protect against double-submit, handle dialogs/focus/Escape, avoid horizontal overflow at 320 px, respect reduced motion.
- Keep sensitive content hidden by default where appropriate for demo/screenshots and opt-in preview masking; never log raw imported messages in CI.

## 4. Work plan — a lean release, not a full rewrite
Estimated engineering effort: **roughly 8–22 AI-assisted engineering hours for the focused scope** if dependencies and branch reconciliation are straightforward. This is a planning range, not a completion promise. Real-export incompatibilities, accessibility problems and CI supply-chain issues can extend it. Do not sacrifice tests to meet an estimate.

### Phase 0 — Freeze and repair the release baseline (P0)

- **CF-00 | Inventory and preservation.** Record local/remote branches, HEAD SHAs, tags, working changes, build inputs and known blockers. Make a separate local backup of both divergent histories before integration. **Files:** `README.md`, branch metadata, `.audits/`. **Acceptance:** nothing overwritten, actual canonical source identified.
- **CF-01 | Resolve branch divergence without force pushes.** The working extension is not on default `master`. Preferred path: create a stable release branch **from the implementation branch**, preserving current `master`; after approval make that stable branch the default. Alternative merge strategy only with a documented, reviewed plan. Never manufacture history, blindly merge unrelated histories or reset remote refs. **Acceptance:** default branch after owner approval shows actual code/docs/tests; both previous tips remain reachable. **Owner-controlled:** GitHub default-branch change/push/publication.
- **CF-02 | Fix dependency integrity and CI.** Reproduce `npm ci` in isolated clean caches on two OSes; inspect `package-lock.json` entry and trusted npm registry metadata for `yocto-queue@1.0.0`, npm/Node versions and possible registry/caching inconsistencies. Do not disable integrity verification or arbitrarily replace lockfile hashes. Resolve root cause with reviewed dependency/lockfile updates if needed; commit changes with evidence. **Files:** `package-lock.json`, `package.json`, `.github/workflows/ci.yml`, `docs/TESTING.md`. **Acceptance:** clean `npm ci` on Windows and Ubuntu, green `npm run test:all` in CI on final SHA.
- **CF-03 | Decide license deliberately.** Owner chooses appropriate copyright holder and license (Apache-2.0 is an option, **not yet approved**); preserve MIT `fflate` notices and asset licenses. Add real `LICENSE`, consistent README/package metadata, `CONTRIBUTING.md` and `SECURITY.md` as proportionate. **Acceptance:** license grant is explicit, internally consistent and checked against release archive. **Owner decision required.**
- **CF-04 | Confirm version and scope.** `package.json` and `public/manifest.json` already say `1.0.0`; decide whether this is the honest first MVP release or if a new version is warranted. Do not reissue an existing tag or claim store approval. **Acceptance:** one release identity across docs/manifest/ZIP/checksums and a clear MVP limitations section.
**Gate G0:** reproducible installation, preserved branch history, approved license, clear version. No further release work can mask failing `npm ci`.

### Phase 1 — Verify and polish core behavior (P0)

- **CF-10 | Import hardening.** Preserve existing 128 MiB source/256 MiB expanded/10,000-entry resource limits unless evidence warrants changes; verify ZIP path traversal, duplicated entries, corrupt CRC, decompression boundary, encrypted/ZIP64 handling, segmented filenames, UTF-8/BOM and unsupported schema messages. Show actionable UI errors. **Files:** `src/importer/archive.ts`, `src/importer/normalize.ts`, `src/background/worker.ts`, `src/ui/main.ts`; importer/unit/E2E tests. **Acceptance:** invalid inputs fail without replacing previous snapshot; malicious fixtures cannot escape/mutate disk.
- **CF-11 | Search correctness.** Keep current Boolean semantics, explicit query budget and active/all branch behavior. Fix counterexamples only; resist building semantic search. **Files:** `src/search/query.ts`, `src/search/index.ts`, `src/ui/main.ts`; unit truth tables and browser tests. **Acceptance:** independent expected hit IDs/counts for Boolean, negative-only, date, role, phrase, title, branch and selection queries; no duplicate ancestors or silently hidden matches.
- **CF-12 | Selection and statistics.** Ensure results pagination doesn't limit selection scope, selection persists across queries as specified but not across reload unless documented; clear/reset behavior; aggregate and per-chat denominators correct, missing metadata unknown rather than zero. **Files:** `src/selection/selection.ts`, `src/analytics/statistics.ts`, `src/ui/main.ts`; unit/E2E tests. **Acceptance:** reproducible counts on known fixtures.
- **CF-13 | Export reliability.** Retain JSON/TXT/CSV/HTML and ZIP SHA-256 manifest; validate metadata, file counts, source/query fingerprints, UTF-8, HTML/CSV escaping, no attachments disguised as preserved originals and complete selection beyond UI page size. **Files:** `src/exports/export.ts`, `scripts/package.mjs`, tests. **Acceptance:** independently unzip and recompute hashes; content matches fixture truth and original source remains unchanged.
- **CF-14 | IndexedDB and worker lifecycle.** Validate atomic import/reimport, failed-quota rollback, restore on reload, corruption recovery path, multi-tab clearing and worker failure/queue behavior. **Files:** `src/storage/*`, `src/background/worker.ts`, `src/ui/main.ts`; integration/E2E tests. **Acceptance:** failure cannot replace the last known-good snapshot; clearing deletes only app-owned data.
**Gate G1:** every core feature is represented by behavior-based tests, not just code inspection or UI snapshots.

### Phase 2 — Minimal usability improvements (P1)

- **CF-20 | First-run clarity.** One obvious import action and visible synthetic demo. Provide a link/instructions to obtain an official ChatGPT export. Verify demo cannot be confused with real user data. **Files:** `src/ui/main.ts`, `src/ui/styles.css`, `src/ui/demo.ts`, README. **Acceptance:** a new tester can run demo, search and export without reading source code.
- **CF-21 | Simplify existing controls, keep advanced.** Organize search / results / selection actions, collapse advanced options, improve labels and feedback. Preserve every currently supported query/selection/export behavior. **Acceptance:** Playwright tests cover both default and advanced paths; no dead buttons or regressions.
- **CF-22 | Keyboard, responsive and accessibility pass.** Dialog focus restoration and Escape, labels, status announcements, contrast, zoom, 320/390/768/1024/1440 viewports, dark mode/reduced motion. **Acceptance:** automated accessibility scan for critical screens plus documented manual keyboard and screen-reader spot-check; no serious known blocker for core flows.
- **CF-23 | Error and privacy communication.** Make local IndexedDB retention (unencrypted), unsupported media, real-account limitations and import replacement rules visible when relevant; ensure no external network, telemetry or hidden extension permissions. **Acceptance:** README, UI and manifest agree.
**Gate G2:** entire happy path and main failure paths are understandable to a first-time user.

### Phase 3 — Testing and release engineering (P0/P1)

- **CF-30 | Complete critical-path E2E.** Test the **real built unpacked MV3 extension**, not only Vite preview, using synthetic fixtures for import → search → open hit/context → branch toggle → select → statistics → export → reload → clear. Validate expected messages and files, not only visibility. **Files:** `tests/e2e/*.spec.ts`, `tests/fixtures/extension.ts`. **Acceptance:** clean Chromium pass, no JS page errors, correct downloaded contents.
- **CF-31 | Expand adversarial testing only where gaps exist.** Add targeted fixtures for empty/large/malformed ZIPs, duplicated IDs, invalid graphs, unsupported media, nested queries, source text injection, CSV formula injection, cancelled/failed storage updates, multi-tab interactions. Existing coverage is substantial; avoid redundant test-count inflation. **Acceptance:** each added test establishes a previously untested invariant and catches a deliberate mutation or known counterexample.
- **CF-32 | Performance / bounded behavior.** Run existing synthetic 1/100/3,000/10,000/25,000-message datasets and 1,000-source selection; report observed memory/latency and failures under declared hardware. Keep input/ZIP safety budgets. Don't invent benchmark claims or tune for an arbitrary number. **Acceptance:** no silent truncation/crash on required tested fixtures and explicit limitations for device-dependent performance.
- **CF-33 | Real-export private smoke test.** Use a genuine **user-supplied** official export only on their machine via existing `CHATFLOW_REAL_EXPORT` runner, with screenshots/traces/video and sensitive output disabled. Do not commit, upload or share source data. If not supplied, mark **NOT RUN**, not PASS; final stable claim requires at least one real-export compatibility pass or a clearly labelled limitation. **Files:** `playwright.real.config.ts`, `tests/real/local-export.spec.ts`, `docs/TESTING.md`. **Acceptance:** valid import, search, aggregate stats and selected download; no actual message text in logs.
- **CF-34 | Release distribution verification.** Produce MV3 `dist/`, signed-independent GitHub ZIP/checksum package, verify icons/assets/manifest/permission list/CSP/licensing from ZIP and fresh unpacked installation in Chrome/Chromium. **Files:** `public/manifest.json`, `scripts/assets.mjs`, `scripts/package.mjs`, package/E2E tests. **Acceptance:** newly downloaded artifact works offline; checksum verified independently.
- **CF-35 | CI clean and reproducible.** Windows and Ubuntu; Node 24; read-only token; use `npm ci` and `npm run test:all`; no real customer data; upload only sanitized failure evidence. **Files:** `.github/workflows/ci.yml`. **Acceptance:** green checks on exact proposed release commit and repeatable clean-clone run.
**Gate G3:** tests run and pass on the candidate SHA; known limitations documented; independent reviewer can reproduce results.

### Phase 4 — Open-source portfolio presentation (P1)

- **CF-40 | Rewrite README for users.** Clear overview, privacy/local behavior, real feature list, non-features, 3-minute quickstart, demo route, install, supported browser/Node, troubleshooting, screenshots, contributor links and independent-of-OpenAI statement. Remove claim discrepancies between branches. **Acceptance:** a stranger can understand and run the product without digging into specs.
- **CF-41 | Documentation parity.** Update `docs/TESTING.md`, architecture/data-flow/security explanation, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, license/third-party attribution and future backlog. No unsupported promises. **Acceptance:** docs references resolve from released default branch, tests verify links where reasonable.
- **CF-42 | Safe visual demo.** Capture a short GIF/video and screenshots using **only authored synthetic conversations**. Include a branch selection, search, complete selected export and offline/privacy indication. **Acceptance:** no real messages, names, access tokens or device paths in distributable media.
- **CF-43 | GitHub cleanup.** Choose clean default branch; description/topics/social preview, issue and PR templates, CI badge only once green, `vX.Y.Z` tag and GitHub Release with SHA-256 and install instructions. Public visibility, default-branch change, tag, release creation and social post require owner approval. **Acceptance:** all public links resolve, assets install, repo history and binary artifacts reviewed for sensitive data.
- **CF-44 | Independent release audit.** Give the separate assessment document to an agent **other than the implementation agent**. Fix blockers, repeat only affected checks plus regression suite, record exact SHAs. **Acceptance:** explicit independent GO/NO-GO evidence; owner decides publish.
**Gate G4:** owner-approved public portfolio release; GitHub stable-release and LinkedIn announcements have separate decisions.

## 5. Fastest legitimate minimum
For a narrowly scoped portfolio MVP, **CF-00 through CF-04; CF-10 through CF-14; CF-20 through CF-23; CF-30, CF-33 through CF-35; CF-40 through CF-44** are the release work. CF-31/CF-32 should run to the extent needed to close real coverage and reliability gaps; don't duplicate existing thorough tests merely to increase numbers.

If time is limited, **simplify the UI rather than implement new features**. Core correctness, fresh installation, passing CI, approved license and a trustworthy demo are not optional.

## 6. Verification commands
From a clean checkout of the **chosen implementation/release branch** (not the current README-only master):

```
node --version          # Node 24 LTS recommended; package allows >=22.18
npm ci                  # must pass with the reviewed lockfile
npx playwright install chromium
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run build
npm run test:e2e
# or, after prerequisites, run the full combined gate:
npm run test:all
```
Privately, only if a real export has been provided:

```
$env:CHATFLOW_REAL_EXPORT = 'C:\private\official-export.zip'
npm run test:real
Remove-Item Env:CHATFLOW_REAL_EXPORT
```
Do not place private exports inside the checkout or commit screenshots/test traces from the real-data runner. CI failures during `npm ci` mean subsequent suites **did not run**. Never report skipped tests as passing.

## 7. Task output / audit template
For every completed task, record:

```
Task: CF-XX
Branch / commit SHA:
Files changed:
Before/after behavior:
Tests added or updated:
Commands executed and exit codes:
Sample fixture expected vs actual:
Privacy/security implications:
Known limitations / skipped tests:
Documentation updated:
Local commit / PR reference:
```
At the end give a summary of verified MVP functions, deferred items, the reproducible test log and unresolved owner decisions.

## 8. Master coding-agent implementation prompt (copy/paste)

```
You are acting as lead engineer and quality owner for MOORKYZ ChatFlow.

Read this document, the current repository README, docs/TESTING.md, relevant
source modules and existing tests. Your assignment is to deliver the FOCUSED
LOCAL-FIRST PORTFOLIO MVP described here, NOT the full V5 feature backlog.

START by determining the actual state of master and
recovery/verified-20261103, the local checkout and working tree. Preserve all
existing refs/history. The working product is on a branch different from master.
Do not force-push, delete branches, merge unrelated histories without review,
change the repository default branch or make anything public without explicit
owner approval.

Fix the verified CI npm EINTEGRITY blocker by investigating the actual package
integrity evidence. Do not bypass integrity verification, disable npm security
checks or invent a checksum. Re-run from a clean dependency cache.

Preserve every existing working offline capability: import, normalization,
search/branching, selection, statistics, exports, local persistence and clear.
Avoid rewriting working core modules or adding unrelated features. Improve UX
with one clear first-run flow and progressive disclosure of advanced options.

Implement each required CF task, add targeted behavior-based tests, run the
appropriate suites, update docs and create small auditable LOCAL commits when
permitted by the repository's rules. No remote pushes, releases, production
changes, store submissions or LinkedIn posts.

Safety constraints: real exports are private; never upload/commit/expose them,
never call live ChatGPT account APIs, never scrape accounts, never broaden
extension permissions or silently add telemetry. ZIP inputs and conversation
text must be handled as untrusted data. Failed imports may not destroy the
previous IndexedDB snapshot. Test and enforce these invariants.

Every finished vertical task must have exact acceptance evidence. A static
screenshot or test-count increase is not completion. Verify real installed MV3
extension workflows, contents of downloaded ZIPs and independent SHA-256s.
Run Windows/Linux CI on the final candidate commit and perform a fresh-install
smoke test. If real official export was not available, state NOT RUN explicitly.

Owner decisions: license/copyright, default branch, public visibility, tags,
releases and Chrome Web Store submission require owner approval. Record them
without stopping work on unrelated implementation tasks.

Do not claim ChatFlow is a complete ChatGPT manager, a full backup of every
multimodal asset, a synchronized account client or Chrome Web Store approved.

The task is complete when the documented MVP works in a fresh install, tests
and CI are green, all critical blockers are resolved, docs match actual
features, and a separate independent auditor can execute the release checklist.

Finally provide: files/commits changed, completed and deferred CF tasks,
commands+results, browser E2E evidence, packaging checks, real-export validation
status, unresolved blockers, owner decisions, and a GO/NO-GO recommendation.
Start implementing now rather than producing another plan.
```

---

*Sources: GitHub source inspection on 2026-11-08 of *`master`* and *`recovery/verified-20261103`*; GitHub Actions run 41548671682. This document makes recommendations and does not certify that any proposed new feature or test is complete.*