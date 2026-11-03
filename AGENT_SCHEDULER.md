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

No additional ChatFlow product task is currently queued. Portfolio-level
documentation coordination is tracked in the portfolio ledger. README backlog
items remain informational until the owner requests and scopes one.
