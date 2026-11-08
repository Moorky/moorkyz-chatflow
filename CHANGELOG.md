# Changelog

All notable changes to MOORKYZ ChatFlow are recorded here. No version has been
tagged or published as a GitHub release yet; publication is an owner decision.

## Unreleased (1.0.0 candidate)

### Fixed

- `package-lock.json` labelled the `yocto-queue` entry as 1.0.0 (and
  `p-limit@3.1.0` as requiring `^1.0.0`) while carrying the integrity hash of
  0.1.0. A clean `npm ci` therefore failed with `EINTEGRITY`. The entries were
  re-resolved by npm; every lock entry now matches registry integrity, tarball
  URL and dependency ranges.
- The sidebar brand link's accessible name now matches its visible text
  (WCAG 2.5.3 Label in Name).

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
- `CONTRIBUTING.md`, `SECURITY.md` and this changelog.

## 1.0.0 offline foundation (untagged)

- Local import of official ChatGPT export ZIP/JSON, normalization, Boolean
  search with branch policies, selection, statistics, TXT/JSON/CSV/HTML exports
  with SHA-256 manifests, IndexedDB persistence and local clearing. See the
  [README](README.md) for the complete feature and limitation list.
