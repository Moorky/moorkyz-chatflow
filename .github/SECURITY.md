# Security policy

## Supported versions

Only the current default-branch code is supported. No signed or store-published
release exists.

## Reporting a vulnerability

Do not open a public issue for a vulnerability and do not attach real
conversation exports. Use GitHub's private vulnerability reporting for this
repository if it is enabled, or contact the repository owner privately through
their GitHub profile. Include a synthetic reproduction, the affected commit and
the observed impact.

## Security model

- The extension requests no host or network permissions and has no content
  scripts. Its CSP disallows remote connections and remote code.
- Imported files are untrusted: ZIP structure, paths, sizes, CRC32 and schemas
  are validated before a snapshot replaces the previous one. Source text is
  rendered as text, never as HTML.
- The normalized snapshot is stored **unencrypted** in IndexedDB in the browser
  profile until it is replaced or cleared. Protect the device and profile.
- Exports escape HTML, neutralize spreadsheet formulas in CSV, and include a
  SHA-256 manifest. They are normalized text, not byte-for-byte backups.
- The optional standalone extraction prototype is not automatically executed
  by the installed extension. The owner reviews/runs it in a chosen ChatGPT tab
  and confirms read-only account access. Its internal endpoints are experimental;
  no platform restriction is bypassed. It follows no redirects and makes no
  third-party requests. Credentials stay in memory and are not exported.
- Extractor checkpoints contain unencrypted conversation data on the ChatGPT
  origin, separately from the extension library. Clear them in the extractor
  panel; clearing the extension cannot clear another origin's storage. Only one
  checkpoint operation is retained, and a cross-tab lock protects active writes.
  Complete account/project coverage and live compatibility are unverified.
- Reconstruction retains sensitive original content and provenance. Review the
  explicit selection before downloading/sharing; source snapshots are unchanged.

No independent security audit has been performed. See the
[README](../src/docs/Development.md#data-integrity-and-privacy) for the full list of guarantees
and limits.
