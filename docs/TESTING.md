# Testing the implemented offline product

## One complete gate

```powershell
npm ci
npx playwright install chromium
$env:CHATFLOW_TEST_PORT = '4177'
npm run test:all
```

`test:all` runs strict typechecking, lint, formatting, unit/integration tests with
V8 coverage gates, the production build/package check, and browser/distribution
tests. It fails on any failing step. Port 4173 is the default; choose another
free port rather than taking over an existing server.

The public automated suites require no account, credentials, private exports,
or external service at test runtime. Tests use isolated browser contexts and
temporary extension profiles. They do not connect to a real ChatGPT account.

## Coverage and behavior matrix

| Surface            | Evidence                                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ZIP/JSON ingestion | BOM, UTF-8, segmented ZIP naming, source SHA-256, CRC/size/path validation, unsupported/encrypted/multidisk/ZIP64 headers, valid ZIP comments containing signature bytes                                                                 |
| Normalization      | Missing/duplicate IDs, invalid graphs/cycles/parents, source parts/text content, roles, dates, attachments, canonical and alternative branches                                                                                           |
| Search             | Independent Boolean truth tables across 16 conversation combinations, same-message vs chat scope, NOT/AND/OR precedence, phrases/escaping, case, title isolation, role/date/selection scope, provenance and offsets                      |
| Selection          | Deduplication, first/last N, invalid counts, deterministic sort, selection beyond the first 40 rendered chats and persistence across queries                                                                                             |
| Statistics         | Zero/empty inputs, both means and denominators, Unicode words/codepoints, all roles, missing timestamps, branch policies and complete source lists                                                                                       |
| Exports            | Every format/report/branch combination, exact counts, unchanged source, checksums/query fingerprints, RFC 4180 cells, HTML escaping, links, nontruncation and explicit consent                                                           |
| Storage            | Actual IndexedDB transaction API using fake-indexeddb in Node plus real Chromium storage tests, replacement, abort rollback, open errors, corruption recovery and clearing                                                               |
| Worker             | Real import/search/statistics/export logic with a mocked persistence boundary; serialized requests, progress, invalid selection, no-import errors, failed save/clear, oversized input and recovery                                       |
| Browser            | Installed MV3 extension and production web UI; exact message navigation/context, branch switching, filters, preview privacy, keyboard/Escape, five viewport widths, theme contrast, multitab clearing, downloads and restoration         |
| First run          | Export-acquisition guidance and limits, synthetic-demo banner (not shown for a user file reusing the demo filename), honest import-failure wording with and without a saved library, collapsed search help and no-results option summary |
| Accessibility      | axe-core WCAG 2.1 A/AA scan with zero serious/critical violations on first-run, results, viewer and export-review screens in light and dark mode; dialog Escape and focus return                                                         |
| Distribution       | ZIP checksum, package/manifest version agreement, local asset presence, PNG icon signatures, offline CSP/no host permissions, bundled dependency notice, and Apache-2.0 `LICENSE`/`NOTICE` identical to the repository copies            |
| Scale              | Synthetic 1/100/3,000/10,000/25,000 messages and 1,000 selected sources, without silent truncation                                                                                                                                       |

`npm run test:coverage` measures the non-UI TypeScript modules under `src`.
Statements, branches, functions, and lines must each reach **95% overall**.
UI behavior is exercised separately by Playwright, not included in that
percentage. Coverage is not a proof of every possible input, independent
security approval, or WCAG certification. HTML and JSON summaries are generated
under ignored `coverage`.

## A runnable example in the actual extension

[example-conversations.json](../tests/fixtures/example-conversations.json) is a
small **authored, synthetic** official-export-shaped example. It is not a
historical export from a real user's account. Its realistic graph includes
message metadata, a regenerated answer, a selected branch, and a second chat.
All IDs and conversation text are intentionally fictional.

[example.spec.ts](../tests/e2e/example.spec.ts) loads the production extension
under its real MV3 CSP, uploads that file, and checks independently specified
values:

1. Two imported chats, six active-path messages, seven all-branch messages.
2. `"rollback plan"` gives one chat and two exact message hits.
3. Next/previous navigation opens the expected local message IDs.
4. Selecting that chat yields four messages in statistics and export, including
   the final nonmatching context message and excluding the discarded answer.
5. Source/report SHA-256 values match Node's independent crypto implementation.
6. Reload restores the snapshot; branch switching makes the alternative answer
   searchable only when explicitly selected.
7. All eight conversation/statistics download-format combinations require
   explicit consent and contain both selected source chats.

Run just the example after building:

```powershell
npm run build
$env:CHATFLOW_TEST_PORT = '4177'
npx playwright test -g 'example:|installed extension downloads'
```

## Testing a real official export locally

No real historical export was supplied for this request. A synthetic example
must not be described as real user-data validation.

The separate real-data runner **requires an existing file** and has no synthetic
fallback or silently skipped test:

```powershell
npm run build
$env:CHATFLOW_REAL_EXPORT = 'C:\path\to\your\official-export.zip'
npm run test:real
```

An official `conversations.json` file is also supported. The caller is responsible
for supplying an actual official export; its provenance cannot be inferred merely
from its JSON shape. The documented import resource budgets still apply.

The runner uses a fresh installed-extension profile, imports all branches, checks
all normalized message-ID/text fingerprints across the worker/export boundary,
verifies source/report hashes and exact counts, confirms reload persistence,
then clears the local snapshot and removes the temporary profile. Import
normalization itself is shared with the product; this round-trip check does not
replace independent raw-schema compatibility validation.

Private input is never copied into tracked fixtures or sent to external services.
Uploads use a generic filename; assertions compare counts/hashes rather than
printing message text. Traces, screenshots, and video are disabled; the real
runner's output directory is not retained. Keep terminal output private:
invalid-source errors may include source identifiers. Downloads are confined to
the test browser's temporary download storage and removed with its context.

The real-data runner is intentionally separate from `test:all`: CI must not need
your private export. Its harness can be rehearsed with the authored example, but
such a rehearsal is explicitly **not** evidence that real historical data passed.

## Known boundaries

Tests cover currently implemented offline functionality, not unimplemented V5
features. PDF, semantic search, advanced export splitting, native account
mutations, store policy approval, broad assistive-technology certification,
and every possible export-schema variant remain outside this suite's claims.
The automated axe scan finds only machine-detectable issues; it is not a manual
screen-reader review or WCAG conformance certification.
Only Chromium is exercised locally; CI declares Windows/Linux on Node 24, but
a local run is not evidence that remote CI executed.
