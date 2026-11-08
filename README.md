# MOORKYZ ChatFlow

**Search. Organize. Analyze. Export.** A free, ad-free, local-first Chromium extension
for exploring official ChatGPT exports. Independent of OpenAI; not developed,
supported, or certified by OpenAI.

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
- Export full selected conversations as TXT/JSON/CSV/HTML, or statistics as
  JSON/CSV/HTML (TXT contains a JSON-formatted statistics report). Each download is
  a ZIP with a SHA-256 manifest, source/query fingerprints, counts, and warnings.
- Hide preview text, use keyboard-accessible controls, and browse light/dark,
  reduced-motion, and responsive layouts. Try the explicitly synthetic demo.

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
   and select the generated `dist` directory.
3. Click the extension action to open the full local workspace.
4. Import your own official export; do not commit real conversations to this repository.

The build produces `artifacts/moorkyz-chatflow-1.0.0.zip` and a companion SHA-256
file. This is a local unsigned package, **not** a published or signed release.
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
AND. Quoted phrases support escaped `\"` and `\\`. Search is literal substring
matching, not regex, stemming, semantic, or fuzzy matching. Unicode source text
is retained; matching uses Unicode-aware JavaScript case folding. Accent and
canonical-equivalence normalization are not yet provided.

- **Same message:** the entire expression must hold in one message or, when
  enabled, the title as a separate document. Title and body terms do not combine.
- **Anywhere in chat:** terms can match different messages or the title, but a
  phrase never spans messages. NOT excludes the entire chat at this scope.
- Role/date filters restrict the candidate messages _before_ Boolean evaluation.
  Title matching remains an independent document, provided at least one message
  passes any active role/date filter.
- Negative-only queries can produce zero text occurrences; qualifying messages
  still have IDs. Conversation-level inclusion without a positive text witness
  is labeled as query-logic inclusion, not a fabricated message match.
- Dates apply to **messages**, not chat creation/update timestamps. From/through
  dates are inclusive UTC calendar days, implemented as `[start, next-day)`.
  Undated messages are excluded only when a date filter is active.
- Empty search lists the imported branch-policy scope. Unknown field syntax is
  an explicit error. Quote literal colons, e.g. `"https://example.com"`.
- First/last N selects **chats**, adding to the current selection. Unknown dates
  sort last; ties break by stable chat ID. Source order is the default.
- Search finds chats; exports/statistics include **all their messages under the
  chosen branch policy**, not just matches. The export preview states this.

The current index scans separate metadata/message document maps; it is not an
inverted or semantic index. Rendering is paged without capping actual results.
The query safety budget is 4,096 characters, 256 tokens, and 32 nesting levels.

## Data integrity and privacy

- **No network permissions, host permissions, content scripts, analytics, remote
  code, or account access.** The installed extension CSP disallows connections.
  The only account navigation is an explicitly clicked source-supplied URL.
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
See the [testing guide](docs/TESTING.md) for the behavior matrix, example provenance,
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
downloads, four viewport widths (320/768/1024/1440), keyboard paths, and primary
button contrast in both themes.
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

No license grant has been selected for this new repository. The specification
recommends Apache-2.0 subject to owner approval; no unapproved license is assumed.
The bundled fflate dependency's MIT license and attribution are retained in both
the installed package and the generated extension distribution.

Tracked self-audit and verification evidence:
[offline foundation cleanup audit](.audits/2026-10-29-offline-foundation.md),
[publication audit](.audits/2026-11-03-publication-audit.md), and
[main-branch history integration audit](.audits/2026-11-03-main-branch-integration.md).
An audit records actual results and outstanding release gates; passing tests
does not imply independent review or publication approval.
