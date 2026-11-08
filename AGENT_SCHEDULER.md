# Agent Scheduler

Use this compact ledger to coordinate scoped ChatFlow requests. Read
[AGENTS.md](AGENTS.md) first. This file is not a lock or authorization for
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
  [.audits/2026-11-08-focused-mvp.md](.audits/2026-11-08-focused-mvp.md).
- **Owner/session:** @Moorky request; Copilot agent session 2026-11-08.
- **Source:** owner-supplied `MOORKYZ_ChatFlow_Focused_MVP_Roadmap_EN.md`
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

- **State:** IN_PROGRESS
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
