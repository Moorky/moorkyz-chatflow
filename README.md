# MOORKYZ ChatFlow

**Find the thought. Keep the context.** A local-first Chromium extension for
searching, analyzing and exporting your ChatGPT conversation archives.
Independent of OpenAI; not developed, supported or certified by OpenAI.

## Start here

1. If this checkout already contains **Extension**, open `chrome://extensions`,
   enable **Developer mode**, choose **Load unpacked**, and select that folder.
2. Otherwise, on Windows with Node 24 (22.18+ supported), run **SETUP.cmd**.
   It installs the locked development dependencies and builds **Extension** and
   **Downloads**. No account connection or publication is performed.
3. Click the ChatFlow extension action, then choose **Explore with synthetic
   demo data** or **Import ChatGPT export**.
4. Search, open exact message hits, select chats and download statistics or
   full selected conversations. To combine context, choose individual messages
   in the viewer, then use **Reconstruct messages**.

For a downloaded extension ZIP, extract it first and load its extracted folder;
you do not need Node to use an already-built extension.

## What works

- ZIP/JSON import, branch-aware browsing and IndexedDB persistence.
- Boolean/phrase/wildcard search, title/message scope, role/date filters and
  an accessible expression toolbar.
- Deterministic chat selection, statistics and JSON/TXT/CSV/HTML export ZIPs
  with SHA-256 manifests.
- Ordered message reconstruction across chats, preserving original provenance.
- An **experimental standalone direct exporter** with Single, Keywords,
  exact Project ID and discovered-inventory modes; checkpoints, pause/cancel/
  resume and incremental reuse. The dashboard explains how to run it separately
  in your own ChatGPT tab.

**Status:** usable, synthetic-tested prototype, not full original-brief
acceptance or a newly published/store-approved release. Live ChatGPT
compatibility is unverified. Project-name discovery, exhaustive account/project
coverage and attachment binaries are not implemented.

## Your data

The installed extension has no network/host permissions, analytics or account
connection. Imports stay unencrypted in your browser profile until cleared.
The separate owner-run extractor makes read-only ChatGPT requests only after
consent and keeps its checkpoints on that origin. Clear the two locations
separately. Keep your original archive and review downloads before sharing.

## Guides

- [Quickstart](Documentation/Quickstart.md)
- [Prototype tour and exact limits](Documentation/Prototype.md)
- [Privacy](Documentation/Privacy.md)
- [Changelog](Documentation/Changelog.md)
- [Development and repository layout](src/docs/Development.md)
- [Testing](src/docs/Testing.md) · [Contributing](.github/CONTRIBUTING.md) ·
  [Security reporting](.github/SECURITY.md)
- [Owner-supplied planning and assessment documents](src/docs/reference/README.md)

The root is for user entry points and legal files. **Documentation** contains
user guides; **src** contains all development material. **Extension** and
**Downloads** are generated. Reports and caches stay in hidden **.output**.

## License

[Apache-2.0](LICENSE), copyright 2026 Moorkyz; see [NOTICE](NOTICE).
The packaged extension includes the bundled fflate dependency's MIT notice.
