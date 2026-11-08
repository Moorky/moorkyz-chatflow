# Changelog

All notable changes to MOORKYZ ChatFlow are recorded here.

## 1.0.0 — 2026-11-08

First public MVP release: a local-first Chromium MV3 extension for exploring
official ChatGPT exports. Not a Chrome Web Store release.

**Known limitation:** compatibility was verified only with synthetic,
official-export-shaped data. No real ChatGPT export has been tested.

### License

- Licensed under Apache-2.0 (`LICENSE`, `NOTICE`, `package.json`). Every packaged
  extension contains `LICENSE`, `NOTICE` and the bundled fflate MIT notice;
  packaging fails if they are missing or differ from the repository copies.

### Fixed

- `package-lock.json` labelled the `yocto-queue` entry as 1.0.0 (and
  `p-limit@3.1.0` as requiring `^1.0.0`) while carrying the integrity hash of
  0.1.0. A clean `npm ci` therefore failed with `EINTEGRITY`. The entries were
  re-resolved by npm; every lock entry now matches registry integrity, tarball
  URL and dependency ranges.
- The sidebar brand link's accessible name now matches its visible text
  (WCAG 2.5.3 Label in Name).
- Findings from the PR #1 code review, each covered by a counterexample test
  that failed before the fix:
  - Supplied non-string or blank `parent` values are rejected instead of
    silently turning a node into a root.
  - With **Anywhere in chat**, NOT-only queries no longer report every message
    as a matching message; such chats are listed by query logic.
  - An empty **Messages only** search lists chats that have no messages under
    the branch policy, so they stay selectable.
  - Restored snapshots with a source URL but no official chat ID are rejected.
  - Import counts and the welcome panel refresh when an import commits, even if
    the retained query is invalid.
  - Short desktop viewports can scroll the sidebar to reach its actions.
  - A failed clear no longer leaves search controls disabled; statistics source
    lists render in linear time; Boolean checks short-circuit on the first
    literal match; ESLint ignores generated `coverage/` output.
- Findings from the independent release audit: invalid UTF-8 imports report an
  actionable message; conversation CSV exports have a separate `content_kind`
  column instead of putting content kind under `coverage_warnings`; packaging
  also refuses optional permissions, content scripts, `externally_connectable`
  and `web_accessible_resources`.

### Added

- First-run guidance: how to request an official ChatGPT export, supported
  formats, and input budgets.
- A banner that labels the synthetic demo library as fictional data.
- An import hint that explains replacement rules once a library exists, and
  import-failure messages that distinguish "previous library preserved" from
  "nothing was saved".
- Collapsed "How search works" help explaining syntax, Same message versus
  Anywhere in chat, Active path versus All branches, and each count.
- No-results panels that list the query, scope, fields, branch policy and filters.
- The privacy dialog and sidebar state that the local snapshot is unencrypted.
- Automated axe-core accessibility scan (development dependency only) and a
  390 px viewport check in the browser suite.
- `CONTRIBUTING.md`, `SECURITY.md`, issue/PR templates and this changelog.

### Included from the offline foundation

- Local import of official ChatGPT export ZIP/JSON, normalization, Boolean
  search with branch policies, selection, statistics, TXT/JSON/CSV/HTML exports
  with SHA-256 manifests, IndexedDB persistence and local clearing. See the
  [README](README.md) for the complete feature and limitation list.
