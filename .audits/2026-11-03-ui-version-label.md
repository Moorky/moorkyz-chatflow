# Sidebar version label — scoped fix

## Finding

Manual inspection of the production preview on local `main` at `b0f707b` showed
`ChatFlow 0.1` in the sidebar, while `package.json` and the extension manifest
both declare `1.0.0`. Synthetic demo import and a local search worked; the demo
snapshot was cleared after inspection.

## Task and acceptance

- Render the sidebar version from the package's version metadata instead of a
  stale hard-coded label.
- Add a browser regression check comparing the visible version with
  `package.json`.
- Keep scope limited to this visible metadata defect; do not imply V5 or store
  readiness.
- Run the repository's complete `npm run test:all` gate from a fresh copy of the
  updated `main` tree, preserving ignored output in the original checkout.

## Code areas

- `vite.config.ts` and a source declaration for the build-time version constant.
- `src/ui/main.ts` sidebar markup.
- `tests/e2e/workflow.spec.ts` version assertion.

## Verification

The Vite build reads `version` from the root `package.json` and defines the
typed `__APP_VERSION__` constant used by the sidebar. The new Playwright check
reads the same metadata and asserts the rendered value.

`npm run test:all` passed in an isolated temporary copy of the updated local
`main` tree on Node.js 22.18.0 / npm 11.5.2 (both meet the declared runtime
floor). It passed typecheck, lint, formatting, all **191 unit/integration tests**,
the configured coverage gates, the production build/package check, and **22/22
browser tests**, including the new version assertion. Coverage was 97.54%
statements, 95.64% branches, 98.34% functions, and 98.62% lines. The generated
11-file package was 32,695 bytes with SHA-256
`e1a7bc2c84f50d1bbbf4e7434697ec811212dbf8b51add6a5a4c7f13a829108e`.

A local production preview displayed `ChatFlow 1.0.0`. Earlier in the same
inspection, the synthetic demo imported four chats and a `migration` search
returned one chat, two matching messages, and three occurrences; that synthetic
snapshot was cleared. The original checkout's ignored build, coverage, package,
and browser-output folders were not overwritten. No real export or credentials
were used. GitHub CI and Node 24 verification remain pending.
