# Quickstart

## Install

For a built ZIP, extract it and select the extracted folder from
`chrome://extensions` → **Developer mode** → **Load unpacked**.
No Node/server is needed to use an already-built extension.

For a source checkout, install Node 24 (22.18+ is supported), then run
`SETUP.cmd` on Windows. The unpacked build is **Extension**, and its ZIP and
SHA-256 file are in **Downloads**.

From any supported development shell you can also run, from the repository root:

```powershell
npm --prefix src ci
npm --prefix src run build
```

## Try it in three minutes

1. Click the extension action and choose **Explore with synthetic demo data**.
2. Search `migration`. Expand the chevron to try expressions, quotes and groups.
3. Open a chat, navigate exact hits, select chats and open **Statistics**.
4. Choose **Export selection**, review the format and privacy confirmation,
   then download the ZIP.
5. To combine messages, open chats and check **Include in reconstruction**.
   Close the viewer, choose **Reconstruct messages**, reorder/review and download.
6. Reload to restore the saved library. **Clear local data** removes only
   ChatFlow's stored snapshot, not original files or downloads.

## Use your own archive

In ChatGPT, request an official export through **Settings → Data controls →
Export data**. Download the ZIP from the email link and import it into ChatFlow.
Importing replaces the old local library only after validation and a successful
save. Invalid files preserve the last committed library.

Input budgets: 128 MiB input, 256 MiB expanded conversation JSON and 10,000 ZIP
entries. Unsupported schemas and encrypted/ZIP64 archives are rejected.

## Optional direct extraction

The dashboard's **Direct ChatGPT export (experimental)** downloads a separate
owner-run script. Follow the [prototype tour](Prototype.md). This is not a
one-click account connection or a verified complete backup. No passwords,
cookies or tokens need to be manually extracted or supplied.

## If something goes wrong

- No matches: check title/message scope, branch policy, role/date and selected
  chat filters. A missing result is not proof of absence from your account.
- Import failed: read the error; keep your original archive. Do not edit private
  exports merely to force acceptance.
- Damaged stored library: clear local data, then reimport.
- Live exporter HTTP/schema failure: stop or resume later as instructed.
  Report the generic error/status, never private content or credentials.

See [Privacy](Privacy.md), [known prototype limits](Prototype.md#important-remaining-limits),
and [private security reporting](../.github/SECURITY.md).
