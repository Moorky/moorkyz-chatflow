# Privacy and local data

The installed extension has no network or host permissions, content scripts,
analytics, account credentials or remote code. Its content security policy
disallows connections.

## Imported library

Your imported, normalized snapshot is stored **unencrypted** in IndexedDB in
this browser profile. Protect the device/profile. Import replacement is atomic:
an invalid file or failed save leaves the previous committed snapshot intact.
Searches are not saved.

**Clear local data** removes ChatFlow's saved library and reloads other open
ChatFlow tabs. It does not delete original files or downloaded exports, and it
is not a forensic secure-erase guarantee.

## Optional standalone extractor

This is a separate, explicitly owner-run script, not an installed-extension
account connection. With your consent, it makes read-only requests to your
selected ChatGPT account/workspace on `https://chatgpt.com`.

Credentials remain in memory. Conversation recovery checkpoints are stored
unencrypted on the ChatGPT origin. Use **Clear checkpoints** in the extractor
to remove them. Clearing ChatFlow's library cannot clear another origin.
Neither tool sends your conversations to a third-party service.

The extractor is experimental and live compatibility is unverified.
Account/project inventory and graph completeness are never presented as
verified. See the [complete limits](Prototype.md#important-remaining-limits).

## Downloads and reconstruction

Downloads may contain private messages, titles, IDs, URLs and provenance.
Review selections before sharing. Reconstruction preserves exact selected text
and source references without changing original chats. Binary attachments are
not copied. Unsupported content is not a complete account backup.

Use synthetic data in bug reports/screenshots. Never attach credentials,
private exports or full network logs. Report vulnerabilities through the
[security policy](../.github/SECURITY.md).
