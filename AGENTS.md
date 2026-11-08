# Repository instructions

Before changing this repository, read [README.md](README.md),
[docs/TESTING.md](docs/TESTING.md), and [AGENT_SCHEDULER.md](AGENT_SCHEDULER.md).

## Product and data boundaries

- Version 1.0 is a local-first offline foundation, not full V5 acceptance or a
  store-ready release.
- Preserve the no-network boundary: do not add network or host permissions,
  content scripts, analytics, remote code, account access, or live-account
  mutations without a specifically scoped owner request and review.
- Use synthetic data for routine tests. Never commit private exports,
  credentials, or conversation data. Keep the real-export test separate; use it
  only with an owner-supplied file and explicit task scope, and keep its output
  private.
- The product is licensed under Apache-2.0 (`LICENSE`, `NOTICE`; copyright
  2026 Moorkyz), chosen by the owner on 2026-11-08. Keep `package.json`, the
  packaged `LICENSE`/`NOTICE`, and third-party notices consistent; do not
  relicense without the owner's decision.

## Work and evidence

- Only queue owner-scoped work. The README's V5 backlog is informational, not
  authorization to implement features.
- Keep one repository task `IN_PROGRESS`; follow recorded ownership and
  handoffs in the scheduler.
- For code changes, use `npm run test:all` as the complete public gate unless
  the task records a narrower scope and why. Node 24 is preferred; Node 22.18+
  is supported.
- Record actual validation results and limitations. Commit, push, and deploy
  according to the current owner and portfolio instructions; a queue entry does
  not authorize external publication.
