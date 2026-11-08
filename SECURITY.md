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

No independent security audit has been performed. See the
[README](README.md#data-integrity-and-privacy) for the full list of guarantees
and limits.
