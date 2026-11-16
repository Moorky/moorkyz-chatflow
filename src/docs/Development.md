# Development and implementation guide

For installation and ordinary use, start with the [user README](../../README.md).
Run all npm commands below **from `src`** (`Set-Location src` from the repository
root), or use `npm --prefix src ...`. The canonical gate remains
`npm run test:all` in that directory.

## Repository layout

```text
README.md, SETUP.cmd, LICENSE, NOTICE   User entry points and legal files
Documentation/                        User guides and changelog
Extension/                            Generated unpacked extension
Downloads/                            Generated ZIP/checksum; older outputs in Archive
src/
  package.json, package-lock.json      Locked npm project
  tsconfig.json                       Editor/typecheck discovery
  index.html                          Vite entry
  ui/, importer/, search/, ...         Product modules
  extension/                          Static MV3 manifest/background and generated assets
  tests/                              Synthetic unit/integration/E2E; separate real-data runner
  tooling/                            Explicit Vite/Vitest/Playwright/ESLint configs
    scripts/                          Asset, standalone-extractor and packaging builds
  docs/                               Contributor docs, scheduler and preserved references
.github/                              CI, contribution/security policies and templates
.output/                              Ignored coverage/browser reports
.audits/                              Historical immutable evidence
```

The root `AGENTS.md` is retained for agent discovery. GitHub policy/workflow
locations and hidden Git/editor settings stay conventional. No root npm wrapper,
duplicate lockfile, generated source copy or extra framework is needed.
The installed MV3 package remains flat with its manifest at the package root,
regardless of how development files are organized.

This follows the minimal root of the local `moorkyz-lib` checkout (README,
license, setup, documentation, src), adapted to an executable extension rather
than copied from its mostly empty source tree. No local `moorkyz-template`
checkout was available.

Configuration choices use supported options, not filesystem workarounds:
[Vite publicDir/outDir](https://vite.dev/config/shared-options.html#publicdir),
[Vitest explicit config](https://vitest.dev/config/),
[Playwright config-relative test directories](https://playwright.dev/docs/test-configuration),
and [ESLint --config](https://eslint.org/docs/latest/use/command-line-interface#-c---config).
The npm package and dependencies live together under `src`; CI sets that working
directory and caches `src/package-lock.json`. Coverage excludes only UI,
tests, tooling, dependencies and type declarations; product gates are 100%.
Documentation filenames use PascalCase. Conventional README/AGENTS and
GitHub-discovered policy names stay unchanged.

`npm run dev` first builds the complete package, then watches the workspace UI
without deleting the standalone extractor. Run the full build after changing
the standalone extractor source.

## Existing implementation details

**Search. Organize. Analyze. Export.** A free, ad-free, local-first Chromium extension
for exploring official ChatGPT exports. Independent of OpenAI; not developed,
supported, or certified by OpenAI.

> Explore and export your ChatGPT conversation history locally, without uploading
> your archive to another service.

This works on official export files you import yourself. It is not a live account
sync, not a guaranteed full backup, and it does not preserve images, files, or audio.

**Prototype additions (unreleased):** an opt-in standalone direct ChatGPT
extractor and provenance-preserving message reconstruction are now included.
The installed extension remains offline and permissionless. The standalone
extractor runs separately in your own signed-in ChatGPT tab, uses experimental
internal endpoints, and has **not been verified against a live account**.
See the [prototype quick tour and limitations](../../Documentation/Prototype.md) before using it.

## Quickstart (about 3 minutes)

1. Build and load the extension (Node.js 24 LTS recommended, 22.18+ supported):

   ```powershell
   npm ci
   npm run build
   ```

   Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**,
   and select the generated `Extension` folder. Click the ChatFlow toolbar action.

2. Click **Explore with synthetic demo data** to try every feature with four
   fictional conversations. A banner marks them as demo data.
3. Search for `migration`, open the hit, select the chat, then use **Statistics**
   or **Export selection** to download a ZIP with a SHA-256 manifest.
4. For your own history: in ChatGPT open **Settings → Data controls → Export data**,
   download the ZIP from the email link, and choose **+ Import ChatGPT export**.
   The same steps are shown in the app under **How to get your export**.
5. **Clear local data** removes the saved snapshot from this browser profile.
6. To combine context, open chats and check **Include in reconstruction** on
   individual messages. Use **Reconstruct messages**, reorder/review the list,
   confirm and download. Original chats are not modified.
7. **Direct ChatGPT export (experimental)** opens instructions and downloads
   the standalone script. It does not silently connect the extension to an
   account. Official export import remains the recommended fallback.

### Troubleshooting

| Symptom                                     | What to do                                                                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Import rejected                             | Read the error text. Unsupported schemas, ZIP64/encrypted ZIPs, and files over the input budgets are refused. Your previously imported library stays unchanged. |
| A conversation you expect is not found      | Try **Anywhere in chat**, **All branches**, or fewer filters. The no-results panel lists what was searched. A snapshot only contains what the export contained. |
| A stored library cannot be read             | Use **Clear local data**, then import the export again. The original export file is never modified.                                                             |
| `npm ci` fails with `EINTEGRITY`            | Use the committed `package-lock.json` unchanged and a clean npm cache. Do not bypass integrity checks.                                                          |
| Browser tests report that port 4173 is busy | Set `CHATFLOW_TEST_PORT` to a free port; tests never take over an existing server.                                                                              |

## What exists today

Version **1.0.0 is an offline foundation**, built from the supplied V5 specification
and search-gap catalog. It is not the full V5 product or a store-ready release.

- Import an official export ZIP, `conversations.json`, or a JSON array containing
  conversations. ZIPs can contain numbered `conversations-1.json`,
  `conversations_2.json`, or `conversations3.json` segments.
- Parse and index in a Web Worker; save one normalized snapshot in IndexedDB.
  Reimport replaces the snapshot only after validation and a successful database
  transaction. Invalid input leaves the previous snapshot intact.
- Search titles/messages with words, exact phrases, parentheses, AND/OR/NOT,
  optional case sensitivity, roles, inclusive UTC message dates, and a selected-chat scope.
- Distinguish **same-message** from **anywhere-in-chat** Boolean evaluation.
  Count matching chats, messages, and literal text occurrences separately.
- Choose active-path or all-branches search. Shared ancestors count once.
  Browse exact local message hits, previous/next matches, and surrounding context.
- Select individual chats, all result chats, or first/last N in the current stable
  sort order. Selection is deduplicated and survives query changes, not reloads.
- View single/multi selection statistics, both mean definitions, and the complete
  source list. Export combined aggregate/per-chat statistics.
- Select individual messages across chats, reorder/remove segments, and export a
  reconstruction with original source fingerprints, message and graph-node IDs.
  Selection is session-only; the reconstruction never replaces source chats.
- Export full selected conversations as TXT/JSON/CSV/HTML, or statistics as
  JSON/CSV/HTML (TXT contains a JSON-formatted statistics report). Each download is
  a ZIP with a SHA-256 manifest, source/query fingerprints, counts, and warnings.
- Hide preview text, use keyboard-accessible controls, and browse light/dark,
  reduced-motion, and responsive layouts. Try the explicitly synthetic demo; a
  banner labels it as fictional data until your own export replaces it.
- First-run guidance explains how to obtain an official export and the input
  limits. Search help, scope/branch explanations, and advanced filters are
  collapsed by default. No-results panels list the query, scope, branch policy,
  and filters that were applied.

**Not implemented:** PDF, advanced export splits, first/last N _message_ export,
saved sets/searches, full timezone selection, fuzzy/semantic/field syntax,
redaction, attachment-file export, resumable import/cancel, or any live-account
mutation. These remain in the V5 backlog. The template's full maintenance CLI
and generated documentation website have not been adopted; this repository uses
a compact local task scheduler.
No independent security or Chrome Web Store approval is claimed.

## Build and install

Use Node.js **24 LTS** (Node 22.18+ is also supported) and npm.

The canonical repository and checkout folder are named `moorkyz-chatflow`.
For a new checkout:

```powershell
git clone https://github.com/Moorky/moorkyz-chatflow.git
Set-Location moorkyz-chatflow
```

From the checkout:

```powershell
npm ci
npm run verify
npm run test:e2e
```

For browser tests, if Playwright reports that Chromium is missing:

```powershell
npx playwright install chromium
npm run test:e2e
```

1. Run `npm run build`.
2. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**,
   and select the generated `Extension` directory.
3. Click the extension action to open the full local workspace.
4. Import your own official export; do not commit real conversations to this repository.

The build produces `Downloads/moorkyz-chatflow-1.0.0.zip` and a companion SHA-256
file. The owner attaches a ZIP and `.sha256` built from a clean checkout of the tagged
commit to each GitHub release by hand; there is no automated release workflow. The
package is unsigned and is **not** published in the Chrome Web Store; load it unpacked.

**Compatibility evidence:** automated and audit testing used only synthetic,
official-export-shaped data. No real ChatGPT export has been tested yet, so
ChatGPT export schema changes or rare variants may be rejected. A rejected import
leaves your existing library unchanged.
Package entry ordering and timestamps are fixed for reproducible packaging.
The distribution includes `THIRD_PARTY_NOTICES.txt`, generated from the installed
bundled dependency's version and license; packaging fails if its license is absent.
`npm run dev` watches the unpacked build; reload the extension after changes.
`npm run preview` serves the production UI on loopback for synthetic local testing;
no server is needed to use the installed extension.

## Search semantics

```text
(migration OR search) AND NOT draft
"exact phrase"
alpha beta
NOT "excluded phrase"
```

Operators are uppercase; precedence is NOT, then AND, then OR. Adjacent terms mean
AND. Quoted phrases support escaped `\"` and `\\`. Search without wildcards is literal substring
matching, not regex, stemming, semantic, or fuzzy matching. Unquoted `*` matches
zero or more characters within one whitespace-delimited word: `moorkyz*`
matches a prefix, `*evidence*` a contained fragment, and `moor*yz` an internal
pattern. Wildcards never cross whitespace; standalone `*` matches each nonempty
word. Quote a literal asterisk, for example `"moorkyz*"`. Unicode source text
is retained; matching uses Unicode-aware JavaScript case folding. Accent and
canonical-equivalence normalization are not yet provided.

- **Same message:** the entire expression must hold in one message or, when
  enabled, the title as a separate document. Title and body terms do not combine.
- **Anywhere in chat:** terms can match different messages or the title, but a
  phrase never spans messages. NOT excludes the entire chat at this scope.
- Role/date filters restrict the candidate messages _before_ Boolean evaluation.
  Title matching remains an independent document, provided at least one message
  passes any active role/date filter.
- Negative-only queries can produce zero text occurrences. With **Same message**,
  qualifying messages still have IDs. With **Anywhere in chat**, a message is a hit
  only with positive text evidence; a chat included without one is labeled as
  query-logic inclusion, not a fabricated message match.
- Dates apply to **messages**, not chat creation/update timestamps. From/through
  dates are inclusive UTC calendar days, implemented as `[start, next-day)`.
  Undated messages are excluded only when a date filter is active.
- Empty search lists the imported branch-policy scope, including chats with no
  messages under that policy. Unknown field syntax is
  an explicit error. Quote literal colons, e.g. `"https://example.com"`.
- First/last N selects **chats**, adding to the current selection. Unknown dates
  sort last; ties break by stable chat ID. Source order is the default.
- Search finds chats; exports/statistics include **all their messages under the
  chosen branch policy**, not just matches. The export preview states this.

The current index scans separate metadata/message document maps; it is not an
inverted or semantic index. Rendering is paged without capping actual results.
The query safety budget is 4,096 characters, 256 tokens, and 32 nesting levels.

### Expression toolbar

The search field shows only the input and a chevron. Click the chevron, or press
Alt + Down while focused in the search component, to expand the expression
toolbar. Alt + Up or Escape collapses it without clearing the query or scope.
The chevron rotates; reduced-motion preferences disable the slide animation.

- Insert AND/OR/NOT or `*` at the current caret. Operators add necessary spaces.
- Select text and choose `" "` or `( )` to wrap it. Empty paired delimiters put
  the caret between them; selected content remains selected after wrapping.
- Choose **Title Only**, **Title & Messages**, or the retained **Messages Only**
  scope. Other role/date/branch and Boolean evaluation options are unchanged.
- Invalid syntax marks the input and shows correction guidance even when the
  toolbar is collapsed. Suggested next controls follow the caret's syntactic
  position. Operator tooltips and focus descriptions include examples.
- **Clear expression** keeps the search options; **Reset search** restores all
  search defaults without discarding the selected chats or imported library.
- Type the syntax directly, or Tab to a toolbar control and activate it with
  Enter/Space. Insertion returns focus to the search input. Enter in the input
  or **Search library** below the field executes the expression.

`src/ui/expression-toolbar.ts` exposes `mountExpressionToolbar` with per-instance
input/scope IDs and clear/reset callbacks. It depends on the expression parser,
not a dataset, worker or account adapter, so future discovery/export/filter
search fields can reuse the same controls. Those additional screens are not
implemented by this change.

## Data integrity and privacy

- **No network permissions, host permissions, content scripts, analytics, remote
  code, or account access.** The installed extension CSP disallows connections.
  The only account navigation is an explicitly clicked source-supplied URL.
- The separately downloaded experimental extractor is **not the installed
  extension**: after explicit owner consent, it makes read-only same-origin
  requests in the owner's ChatGPT tab. Its credentials remain in memory; its
  unencrypted checkpoints are stored under the ChatGPT origin and require
  **Clear checkpoints** there. Clearing the ChatFlow library cannot clear
  another origin's checkpoints. No third-party service receives the data.
- Imports are local snapshots, not proof of live-account completeness. No-results
  screens show the searched inventory, source, import time, and integrity warnings.
- Missing times/projects remain unknown. Missing official IDs get labeled local
  surrogates. Duplicate IDs, cycles, broken parents, and unsupported schemas stop
  the import instead of silently dropping data. Missing active paths are warned
  about; use All branches rather than guessing a canonical answer.
- Only source-supplied `https://chatgpt.com/c/<matching-chat-id>` URLs are enabled,
  after host/path/identity validation. Live access is **not** verified. Missing
  links and message deep-links are never invented.
- Attachment/media references are inventoried when present. Binary media and
  unsupported nontext content are not read, downloaded, or exported as if available.
- Input safety budgets: **128 MiB compressed/input**, **256 MiB expanded conversation
  JSON**, **10,000 ZIP entries**. These are explicit resource budgets, not message
  count limits. ZIP64, encrypted, and multi-disk ZIPs are rejected. Directory bounds,
  duplicate entries, unsafe paths, extracted sizes, and conversation CRC32 are checked.
- Source text is never rendered as HTML. Export HTML escapes untrusted content
  and contains no scripts/external assets. CSV follows RFC 4180 and prefixes
  formula-like cells with an apostrophe; use JSON for unmodified source text.
- The source artifact is SHA-256 fingerprinted but not retained. The normalized
  snapshot is stored **unencrypted** in this browser profile until replaced or cleared.
  Protect the device/profile accordingly. No query history is persisted.
- These are normalized text exports, not byte-for-byte account backups. Unsupported
  source metadata and original media are not preserved. Keep the official source
  archive. Message `parentId` refers to an exported graph node, not an invented
  parent message ID.
- **Clear local data** removes the saved snapshot and current app memory through
  reload; other open ChatFlow tabs reload through a local BroadcastChannel.
  Source files/downloads are untouched. This is not a forensic secure-erase guarantee.

Statistics count word-like `Intl.Segmenter('und')` segments and Unicode codepoints,
not tokens or bytes. The weighted mean uses the message count as denominator;
the mean of chat means uses nonempty chats. Zero-message means are unknown.
Each report includes all selected sources, not a top-ten shortcut.

## Development and evidence

Run the complete public test/build gate with `npm run test:all`. It includes
unit/integration coverage thresholds and the actual installed-extension example.
See the [testing guide](Testing.md) for the behavior matrix, example provenance,
and the separate `CHATFLOW_REAL_EXPORT` / `npm run test:real` local-data test.

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run test:e2e
```

Browser tests start their own production preview on port 4173 and never take over
an existing server. If that port is in use, choose a free port without stopping
the other process:

```powershell
$env:CHATFLOW_TEST_PORT = '4175'
npm run test:e2e
```

Public tests use only synthetic data: 1/100/3,000/10,000/25,000 messages, 1,000 selected
sources, branches, missing metadata, malformed ZIP/JSON, Unicode, Boolean
scope differences, HTML/CSV injection counterexamples, manifest hashes, storage
restoration/recovery, failed-import atomicity, multi-tab clearing, navigation,
downloads, five viewport widths (320/390/768/1024/1440), keyboard paths, primary
button contrast in both themes, and an automated axe-core WCAG 2.1 A/AA scan of the
first-run, results, viewer, and export-review screens in light and dark mode.
The browser suite uses the production web build and also loads the real unpacked
MV3 extension to exercise its worker, storage, and CSP. Packaging is checked
separately. CI runs on Windows/Linux with Node 24, pinned actions, and a read-only
token. Store validation, real-account integration, and broad assistive-technology
certification are not covered by these tests.

The implementation selectively follows the V5 template-derived conventions:
product code under `src`, opt-in minimal tooling, pinned dependencies/lockfile,
strict TypeScript, four-stage work/verification, ignored runtime output, explicit
permission boundaries, and evidence instead of release claims. The upstream
template itself was not modified or wholesale copied.

## License

MOORKYZ ChatFlow is licensed under the [Apache License 2.0](../../LICENSE).
Copyright 2026 Moorkyz; see [NOTICE](../../NOTICE). The bundled fflate dependency's MIT
license and attribution are retained in both the installed package and the
generated extension distribution (`THIRD_PARTY_NOTICES.txt`). Every packaged
extension also contains `LICENSE` and `NOTICE`.

Tracked self-audit and verification evidence:
[offline foundation cleanup audit](../../.audits/2026-10-29-offline-foundation.md),
[publication audit](../../.audits/2026-11-03-publication-audit.md),
[main-branch history integration audit](../../.audits/2026-11-03-main-branch-integration.md), and
[focused MVP audit](../../.audits/2026-11-08-focused-mvp.md), and the
[independent release assessment](../../.audits/2026-11-08-independent-release-assessment.md).
An audit records actual results and outstanding release gates; passing tests
does not imply independent review or publication approval.

See also [Changelog.md](../../Documentation/Changelog.md), [CONTRIBUTING.md](../../.github/CONTRIBUTING.md), and
[SECURITY.md](../../.github/SECURITY.md).
