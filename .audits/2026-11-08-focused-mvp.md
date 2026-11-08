# Focused portfolio MVP — local implementation audit

Source request: the owner-supplied _MOORKYZ ChatFlow — Focused Portfolio MVP
Roadmap_ (2026-11-08), CF-00 to CF-44. Scheduler entry: `CHATFLOW-MVP-01`.
Only local work was done: no push, tag, release, visibility or default-branch
change, store submission or media publication.

## CF-00 — Inventory

- Local and remote refs at start: `dev` = `main` = `origin/dev` = `origin/main` =
  `4723c6b`; `origin/master` = `6956b95` (README only);
  `origin/recovery/verified-20261103` = local `master` = `1db2d49`. No tags.
  Clean working tree.
- The roadmap's baseline is partly outdated: `main` already merges the README-only
  `master` with the recovery branch (`b0f707b`), so both earlier tips are
  reachable. `origin/HEAD` still points at `master`; changing the default branch
  is an owner action (CF-01).
- An all-refs `git bundle` backup was written outside the checkout before
  changes were committed.

## CF-02 — Dependency integrity (root cause fixed)

- Reproduced: `npm ci` with the original lockfile and a fresh cache failed with
  `EINTEGRITY` for `yocto-queue-1.0.0.tgz` (wanted `sha512-rVksvs…`, got
  `sha512-9bnSc/…`).
- Evidence: the downloaded 1.0.0 tarball hashed independently to
  `sha512-9bnSc/…` (sha1 `7f816433…`), matching the signed registry metadata. The
  lockfile's hash is the registry value for **yocto-queue 0.1.0**. The registry
  also shows that `p-limit@3.1.0` requires `yocto-queue ^0.1.0`, while the
  lockfile recorded `^1.0.0`. The entry was mislabelled when the lockfile was
  first committed (`c61d6be`). It was not a registry or cache fault.
- Fix (`6b84373`): the two corrupted entries were removed and re-resolved by
  `npm install --package-lock-only`. No hash was entered by hand. Every lock
  entry was then compared with registry integrity, tarball URL and dependency
  ranges: 172/172, and 174/174 after adding the axe dependencies, with 0 problems.

## CF-2x — Usability, privacy and accessibility (`3694c27` and follow-up)

- First run: **+ Import ChatGPT export** primary action with format hint;
  collapsible export-acquisition steps (Settings → Data controls → Export data)
  and input budgets; demo remains a visible secondary action.
- The synthetic demo is labelled by a banner, shown only when the source filename
  and every chat ID match the built-in demo.
- After a library exists, the import hint states the replacement rule. Import
  failures say "previous local library was preserved" only when a library is
  loaded (covered by the existing failed-import atomicity tests); otherwise
  "Nothing was saved".
- "How search works" is collapsed by default and explains syntax, Same message
  versus Anywhere in chat, Active path versus All branches, and each count. An
  independent review found the first count wording overstated occurrences; it
  was corrected to match `src/search/index.ts`.
- No-results panels list the query, scope, fields, branch policy and filters.
- The sidebar and privacy dialog state that the IndexedDB snapshot is unencrypted.
- axe-core found a real WCAG 2.5.3 Label-in-Name failure on the brand link; it
  was fixed, and the scan now gates first-run, results, viewer and export-review
  screens in light and dark mode. A 390 px width was added to the viewport check.
- Docs: README quickstart/troubleshooting, TESTING matrix, CHANGELOG,
  CONTRIBUTING, SECURITY. No license grant was added.

## Verification

Environment: Windows, Node.js 22.18.0, npm 11.5.2 (meets the declared floor;
Node 24 was not available locally).

| Check                                                                       | Result                                                                                                                                                           |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`, original lock, empty cache                                        | exit 1, `EINTEGRITY` (reproduced)                                                                                                                                |
| `npm ci`, repaired lock, empty cache, copy of tracked files                 | exit 0                                                                                                                                                           |
| `npm run test:all` on repaired baseline (before UI changes)                 | exit 0; 191 unit/integration; 22/22 browser                                                                                                                      |
| Fresh `git clone` of `dev` at `3694c27`, empty cache, `npm ci` + `test:all` | exit 0; 191/191 unit/integration; coverage 97.54 / 95.64 / 98.34 / 98.62 (stmts/branches/funcs/lines); 25/25 browser incl. installed MV3 extension and axe scans |
| Package                                                                     | 11 files; SHA-256 identical between the in-place build and the fresh clone at `3694c27`                                                                          |

The help-text correction after `3694c27` was re-verified in the checkout:
typecheck, lint and format check exit 0; build exit 0 (11-file package,
SHA-256 `1b687277…37e7`); browser suite 25/25 passed. Unit/integration code
was unchanged by that correction.

## Not done / owner decisions

- **CF-01/CF-43:** default branch, pushes, visibility, tags, GitHub release,
  social preview and announcements — owner approval required.
- **CF-03:** product license and copyright holder — owner decision; none added.
- **CF-04:** identity stays `1.0.0` (no tag or published release exists); the
  owner should confirm before tagging.
- **CF-35:** remote Windows/Ubuntu CI on Node 24 has **not** run for these
  commits (nothing was pushed and `gh` was not authenticated). Linux `npm ci`
  was not reproduced locally (Docker engine not running).
- **CF-33:** real-export smoke test **NOT RUN**; no export was supplied.
- **CF-42:** no distributable media was committed; review screenshots used
  only the synthetic demo and were kept outside the repository.
- **CF-22:** manual screen-reader spot check not performed; axe covers only
  machine-detectable issues.
- **CF-44:** an automated code-review agent reviewed the diff; this is not the
  independent human GO/NO-GO audit the roadmap requires.

Recommendation: **NO-GO for public release** until license, remote CI on the
final SHA, and owner publication decisions are complete. Local build and tests
are green.

## Addendum — 2026-11-08, release follow-up (`CHATFLOW-REL-01`)

The open items above were later resolved on the owner's instruction ("Do all
that for me, license should be apache 2.0"):

- **CF-03:** Apache-2.0 `LICENSE` (canonical text) and `NOTICE` (copyright 2026
  Moorkyz) added and shipped in every package (`4059f12`).
- **CF-35:** remote Windows/Ubuntu CI on Node 24 is green for the release
  candidates. The release SHA and run IDs are recorded in the release notes.
- **CF-44:** an independent auditor agent assessed `cf302f2` from a fresh clone
  and installed the release ZIP in a clean offline Chromium profile. It found no
  Critical/High defects; see
  [the independent assessment](2026-11-08-independent-release-assessment.md).
  Its Medium/Low findings F-01, F-02, F-06, F-07, F-08, F-09 and F-11 were
  resolved in `6289197`, which the auditor re-verified with a GO verdict
  (package SHA-256 `90c45bef…cf27`). F-04 (`master` fast-forward) and F-05
  (upload of a clean-clone ZIP) are part of the pending publication step below.
- Still open: real-export smoke test (CF-33, NOT RUN) and a manual screen-reader
  check (F-03). Both are disclosed as limitations.
- **Publication pending:** the GitHub credential expired before the `master`
  fast-forward, `v1.0.0` tag, release upload and visibility change. These steps
  are scripted against the verified SHA and run once the owner logs in again.
