# Agent Scheduler

Use this compact ledger to coordinate scoped ChatFlow requests. Read
[AGENTS.md](../../AGENTS.md) first. This file is not a lock or authorization for
network access, private data, account actions, commits, pushes, or deployment.

## Workflow

1. Record each real owner request with its scope, acceptance evidence, owner,
   and dependencies. Do not turn the README's V5 backlog into queued work by
   inference.
2. Keep at most one item `IN_PROGRESS`. Take the first `READY` item whose
   dependencies are complete; do not take another owner's `CLAIMED`,
   `IN_PROGRESS`, or `PAUSED` item without a recorded handoff.
3. Claim the item with its owner/session and intended file scope. Re-read the
   entry before editing and stop if ownership conflicts.
4. Work only within that scope and preserve other agents' changes and local
   generated data.
5. Record actual checks, results, and remaining limits. Mark an item `DONE`
   only after its acceptance evidence is complete. Follow the current owner and
   portfolio instructions for commits and any separate publication action.

## States

| State       | Meaning                                                    |
| ----------- | ---------------------------------------------------------- |
| READY       | Scoped and eligible; work has not started.                 |
| CLAIMED     | Reserved by a named owner/session but not active.          |
| IN_PROGRESS | The single active repository task.                         |
| PAUSED      | Explicitly paused; retain the owner and restart condition. |
| BLOCKED     | A concrete input, approval, or prerequisite is missing.    |
| DONE        | Acceptance evidence is recorded.                           |

## Queue

Portfolio-level documentation coordination is tracked in the portfolio ledger.
README backlog items remain informational until the owner requests and scopes
one.

### CHATFLOW-MVP-01 — Focused portfolio MVP (local work)

- **State:** DONE (local scope). Owner-gated items below remain open; evidence in
  [.audits/2026-11-08-focused-mvp.md](../../.audits/2026-11-08-focused-mvp.md).
- **Owner/session:** @Moorky request; Copilot agent session 2026-11-08.
- **Source:** owner-supplied `FocusedMvpRoadmap.md`
  (focused MVP, CF-00 to CF-44). The full V5 backlog stays out of scope.
- **Scope:** local repository work on `dev`: dependency-integrity repair
  (CF-02), behavior verification and targeted fixes (CF-1x), first-run and
  progressive-disclosure UX (CF-2x), test/release checks (CF-3x), and
  documentation (CF-40/41). Local commits only.
- **Owner-gated, not done by this task:** license choice (CF-03), default branch,
  pushes, visibility, tags, releases, media publication and store submission
  (CF-01/CF-43), remote CI evidence (CF-35), real-export run (CF-33) and the
  final independent GO/NO-GO decision (CF-44).
- **Acceptance:** clean `npm ci` with a fresh cache, green `npm run test:all`,
  and an audit under `.audits/` recording commands, results and open gates.

### CHATFLOW-REL-01 — License and v1.0.0 publication

- **State:** BLOCKED — the GitHub credential returned HTTP 401 after `6289197`
  was pushed. Restart condition: owner completes `gh auth login`, then runs the
  prepared publish step (fast-forward `master` to `6289197`, tag `v1.0.0`,
  upload the clean-clone ZIP with SHA-256 `90c45bef…cf27`, make the repo public).
- **Done so far:** Apache-2.0 license; review and audit fixes; green CI on
  Ubuntu/Windows; independent re-verification GO at `6289197`; PR #2 open.
- **Owner/session:** @Moorky, 2026-11-08: "Do all that for me, license should be
  apache 2.0" (covers the owner-gated items of CHATFLOW-MVP-01).
- **Scope:** Apache-2.0 `LICENSE`/`NOTICE` (copyright 2026 Moorkyz) in the repo
  and package; history review; push `dev`, PR into the default `master`, green
  Windows/Ubuntu CI on the final SHA; independent audit per the owner's release
  assessment template; `v1.0.0` tag and GitHub release with ZIP + SHA-256;
  repository metadata and public visibility.
- **Out of scope:** LinkedIn post and Chrome Web Store submission.
- **Acceptance:** green CI on the released SHA, release asset checksum verified
  after download, audit recorded under `.audits/`.

### CHATFLOW-SEARCH-01 — Advanced expression toolbar

- **State:** DONE (local scope).
- **Owner/session:** @Moorky request, 2026-11-13; Copilot session
  b7309bc7-304d-4a97-9d90-febff7ad4dd0.
- **Scope:** reusable, collapsible search expression controls; caret insertion,
  delimiter wrapping, scope selection, inline validation and contextual
  suggestions; wildcard matching; directly related search tests and docs.
- **Boundaries:** local synthetic data only; no account access, permissions,
  dependency additions, publication or changes to export selection semantics.
  The earlier broad direct-extraction brief is not implemented by this item.
- **Acceptance:** focused insertion/search/browser tests and `npm run test:all`,
  including keyboard, responsive and accessibility checks.
- **Evidence:** `npm run test:all` passed on Node 22.18.0 with
  `CHATFLOW_TEST_PORT=4189`: 270 unit/integration tests, 31 browser/distribution
  tests, typecheck, lint, formatting and build/package verification. Overall
  coverage: statements 98.14%, branches 97.16%, functions 98.48%, lines 98.98%.
  Browser checks verified the 90-degree chevron, reduced motion, caret/focus,
  title-only and wildcard results, clear/reset, four viewport widths and zero
  serious/critical axe findings on the expanded toolbar in both themes.
- **Limits:** synthetic local testing only, not real-account extraction or a
  WCAG certification. Existing offline permissions and export behavior remain.

### CHATFLOW-PROTOTYPE-01 — Owner-run extraction prototype

- **State:** DONE (local prototype and repository organization only).
- **Owner/session:** @Moorky, 2026-11-16; Copilot session
  b7309bc7-304d-4a97-9d90-febff7ad4dd0.
- **Scope:** finish a usable local prototype with an explicitly opt-in,
  standalone read-only ChatGPT extractor, four extraction modes, local recovery,
  individual JSON files/manifests, import handoff and message reconstruction.
- **Boundary review:** the earlier owner brief explicitly requested authenticated
  extraction. Keep the extension permissionless and offline; the separately
  downloaded script runs only in an owner-chosen ChatGPT tab after confirmation.
  No account mutations, credential persistence, telemetry or third-party requests.
  Internal ChatGPT endpoints are experimental, not an official supported API.
- **Acceptance:** deterministic synthetic adapter/lifecycle/browser tests and
  `npm run test:all`; usable extension ZIP and standalone script.
- **Owner input unavailable:** default to owner-run live testing. No private
  account or real export is accessed by the agent. Live compatibility and
  account-wide completeness must remain explicitly unverified.
- **Added owner scope, 2026-11-16:** preserve all five supplied documents as
  historical references; organize like the local `moorkyz-lib`: user entry
  points/legal files at root, user guides in `Documentation`, development
  package/dependencies/tests/tooling/docs under `src`, reports in `.output`,
  generated installable build/ZIP in `Extension`/`Downloads`. No files/history
  discarded; older generated packages moved to `Downloads/Archive`.
- **Validation, 2026-11-16, Windows / Node 22.18.0:**
  - `SETUP.cmd` passed, including a clean locked `npm ci` and production build.
  - `npm --prefix src run test:all` passed: 339 unit/integration tests,
    36 browser/distribution tests; typecheck, lint, formatting, four coverage
    thresholds, production build and actual installed-MV3 examples.
  - Coverage: statements 98.14%, branches 96.26%, functions 97.52%, lines 98.73%.
  - Standalone synthetic browser checks cover recovery, filtering, project
    membership, auth/rate-limit failures, reconstruction, narrow layouts and
    automated light/dark accessibility. Fixed a shadow-host dark contrast issue.
  - Active document links checked; all five owner attachments preserved
    byte-for-byte. Historical audit files were not rewritten.
  - Development output preservation checked; production ZIP reproduced after
    relocation and after the final UI correction.
  - ZIP `Downloads/moorkyz-chatflow-1.0.0.zip` SHA-256:
    `88235b7fb641ab7b7ba7b0e49eea9da607d9e4ad5a4c909e7f5323a3233f5fa7`.
  - `npm --prefix src audit --omit=dev`: zero findings. Full install reported
    nine moderate development-dependency findings; no forced/unrelated upgrades.
- **Not accepted as complete:** original broad direct-extraction MVP, exhaustive
  account/project discovery, project-name resolution, attachment binaries,
  live-account/real-export compatibility, remote CI, independent release
  approval or publication. These require additional owner-scoped work/evidence.

### CHATFLOW-DOCS-01 — Documentation names, full verification and push

- **State:** DONE (local implementation, audit and validation).
- **Owner/session:** @Moorky, 2026-11-16; same Copilot session.
- **Scope:** PascalCase documentation filenames and the `Documentation` user
  guide folder; update live links and naming guidance. Keep conventional
  `README.md`, `AGENTS.md` and GitHub-discovered policy filenames unchanged.
  Preserve historical audit and supplied-document content.
- **Added owner scope:** run all tests, close measured product coverage gaps,
  test the prototype interactively in the browser, audit all combined changes,
  then commit and push `dev` without force. Read root `AGENTS.md` again first.
- **Acceptance:** case-exact local links, unchanged supplied document bytes,
  actual coverage metrics, full public gate and browser evidence.
- **Evidence, Windows / Node 22.18.0:**
  - PascalCase filenames and `Documentation` links verified case-exact for
    Linux; all five renamed owner snapshots remain byte-identical.
  - `npm --prefix src run test:all`: PASS, 370 unit/integration and 36
    browser/distribution tests. Core statements/branches/functions/lines are
    all 100%; thresholds were raised to 100 without new product exclusions.
  - Integrated-browser checks: synthetic import/restore (4 chats, 9 messages),
    `migration*` (1 chat, 2 message hits), inline errors, exact next-hit navigation,
    full-context statistics, reconstruction review and 390px toolbar layout.
    Actual downloaded content is asserted by installed-MV3/Playwright tests.
  - Audit fixes: root-anchored output ignores so Windows cannot exclude
    `src/extension` source files; checked damaged cached identities/filenames
    before producing ZIP entries; contextual incomplete-stream errors.
    Single-parent traversal no longer contains an unreachable repeat-visit test;
    active-path and disconnected cycle checks remain independently tested.
  - Required manifest/background sources are staged; staged whitespace and
    credential-pattern checks passed. Lockfile/dependency versions unchanged.
  - Latest ZIP SHA-256:
    `ae13517f9054787e054e423acd8e7509284155b5ef8aced295938807fa322221`.
- **Publication follow-through:** owner authorized commit/push to `dev`, without
  force. This record captures pre-publication evidence; the actual pushed SHA
  and remote CI outcome are reported separately after verification.
- **Limits retained:** no real-export/live-account check or independent release
  sign-off. Instrumented UI coverage is not claimed. Existing development-only
  npm audit findings were not hidden or fixed with forced upgrades.

### CHATFLOW-REFS-01 — Original documents and supplied offline extractor

- **State:** DONE (reference import and local verification).
- **Owner/session:** @Moorky, 2026-11-17; same Copilot session.
- **Scope:** compare the two supplied original Markdown documents with the saved
  pasted versions; restore original formatting without duplicate documents.
  Preserve the new two-file Python archive as an unintegrated developer
  reference under `src/tooling/reference/LocalArchiveExtractor`.
- **Boundaries:** do not execute the supplied Python/launcher, install Python
  dependencies, modify Downloads originals, replace the tested TypeScript
  product, or imply this offline archive reader performs live extraction.
- **Acceptance:** byte-for-byte copies, unchanged normalized document content,
  accurate provenance/limitations, valid links, formatting and review.
  Reference-only scope: no executable product/configuration changes, so no
  repeat of runtime/browser tests is needed; their previous results are not a
  validation claim for the supplied helper. Commit/push follows owner workflow.
- **Evidence:** both original documents and both extracted source files match
  their supplied bytes exactly; document wording/content matches the earlier
  copies after normalizing Markdown tables, links and code-fence labels.
  Active links and filename case checked. `npm --prefix src run format:check`,
  staged diff checks and credential-pattern inspection passed. Git attributes
  allow valid two-space Markdown hard breaks only in supplied references.
  No runtime, build or test configuration changed; the Python/launcher were not
  executed or presented as validated product functionality.
- **Provenance:** owner archive SHA-256
  `ae1f1a3d0a29ebe0aadcbf23d02cbcfbd869bac6fd3b905580b0351e39050f95`;
  per-file hashes and source-inspection limitations are recorded with the
  helper. Downloads originals were not changed or removed.
