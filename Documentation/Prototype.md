# ChatFlow prototype: quick tour

## What is ready to try

Run npm commands from `src`, or use `npm --prefix src ...` from the repository
root. On Windows, `SETUP.cmd` handles installation and the production build.

Build with `npm run build`, then load `Extension` as an unpacked extension from
`chrome://extensions`. The complete public verification command is
`npm run test:all`. Node 24 is preferred; Node 22.18+ is supported.

1. Import an official export ZIP/JSON or choose the synthetic demo.
2. Search normally, or expand the chevron for Boolean operators, wildcards,
   quotes, groups, title/message scope and correction guidance.
3. Open a chat to inspect exact hits and surrounding messages. Choose active
   path or all branches without changing source data.
4. Select chats for statistics or full-chat JSON/TXT/CSV/HTML downloads.
5. To combine context, check **Include in reconstruction** on individual
   messages in any chats. Close the viewer, choose **Reconstruct messages**,
   reorder/remove segments, name the output, review privacy consent and download.
   The ZIP contains a SHA-256 manifest and a reconstruction with per-message
   provenance. Selection order is explicit, not a fabricated conversation tree.

## Direct ChatGPT export: experimental, owner-run

The extension remains offline, with no account/host permissions or content
scripts. **Direct ChatGPT export (experimental)** on the dashboard downloads a
separate self-contained `chatflow-extractor.js` from the local package.

1. Review the script. Open your own signed-in `https://chatgpt.com` tab.
2. Run the downloaded script in that tab's developer console, if your browser
   and platform permit it. Do not disable browser security controls or circumvent
   access restrictions. Do not send anyone your password, cookies or token.
3. The script opens a control panel. Merely opening it makes no account request.
   The live guide explains the current step, points to settings/consent controls
   and updates during extraction, pause/recovery and ZIP preparation. After
   preparation it tells you to check browser downloads and import the ZIP into
   ChatFlow; it does not claim the browser actually saved a file.
4. Choose a mode and confirm read-only extraction and local checkpoint storage:
   - **Single chat:** conversation URL or ID; the current chat URL is filled in
     automatically when the script is opened on a conversation page.
   - **By keywords:** the same Boolean/wildcard expression toolbar; title-only
     filters inventory before fetching bodies. Title & Messages evaluates
     separate title/message documents, including all returned branches.
   - **Project:** exact project ID, matched to inventory `gizmo_id` metadata,
     never inferred from chat titles.
   - **All discovered chats:** deduplicated account inventory; optionally include
     the separate archived inventory if accessible.
5. Under **Workspace and performance options**, a blank workspace ID means the session's default account. For another
   workspace, supply its account ID. The script **does not infer the workspace
   currently displayed in another tab**.
6. Click **Start new export**. Progress reports stage, discovered/processed/
   remaining chats, messages, failures and wall time. ETA is unavailable rather
   than guessed. Concurrency is bounded to 1-4 requests.
7. **Pause** or **Cancel** stops in-flight work and retains saved results.
   **Resume / update checkpoint** retries the same saved operation/options:
   discovery restarts to avoid trusting stale offsets; unchanged exported chats
   with known update markers are reused. Unknown markers and failed chats are
   fetched again. Authentication and rate-limit errors pause for manual recovery,
   not an aggressive automatic retry loop. Requests time out after 30 seconds.
8. **Download available ZIP** works for completed or interrupted operations.
   Import this ZIP back into ChatFlow. The official importer is unchanged.
9. **Clear checkpoints** removes the script's local results and recovery state
   from the ChatGPT browser profile. Downloaded files are not deleted.

Rerun the same script after reload to restore the most recent checkpoint.
Start new export asks before discarding the previous checkpoint. Only one
extraction operation is retained; Web Locks prevent competing script instances
from writing at the same time. Resume refuses a different account/workspace.
No token or credential is saved in checkpoints, logs or output.

### Direct export files

- `conversations.json`: original returned graphs in an importer-compatible array.
- `conversations/<sanitized-title>_<UTC-start>_<id>.json`: one versioned,
  normalized document per chat; filenames fit a 240-byte component budget.
- `manifest.json`: operation ID, options, start/end, status, inventory,
  per-chat outcomes, counts, file sizes and SHA-256 digests.
- `projects/manifest.json`: project ID and exported chat IDs for project mode;
  instructions and project files explicitly indicate unavailability.

Conversation JSON uses `schemaVersion: "1.0.0"`. Metadata/statistics precede
messages; `exportResult` and `endTime` follow them. Each message contains its
original message/node/parent-node identity, active-branch marker, role, original
timestamp or `null`, content, text/code/Markdown classification, blocks,
word/codepoint/UTF-8-byte statistics and attachment references with
`retrievalStatus: "not-requested"`. Original message objects remain under
`source`, preserving unsupported parts, citations, model and tool metadata.
The importer-compatible array additionally preserves complete returned graphs.

`durationSincePreviousMessageMs` is the difference from the preceding serialized
message's timestamp, **not generation latency**; graph traversal across branches
is not necessarily chronological. Missing timestamps/tokens remain `null`.
Classification is heuristic, not a full Markdown/media parser. Original text
is always retained; unsupported nontext content is preserved in source objects.

Every direct conversation and operation is marked **completeness: unverified**.
Structural graph validation and successful HTTP requests do not establish that
the service returned every accessible chat, branch, attachment or message.

## Architecture

- `src/extraction/chatgpt.ts`: read-only session/inventory/conversation adapter.
  Only `/api/auth/session` and GET `/backend-api/...` requests on
  `https://chatgpt.com` are used. Redirects fail closed.
- `src/extraction/engine.ts`: shared four-mode lifecycle, Boolean filtering,
  pagination/deduplication, bounded concurrency, recovery, ZIP and manifests.
- `src/extraction/store.ts`: transactional IndexedDB checkpoints/documents,
  separate from the extension's local library database.
- `src/extraction/serialize.ts`: versioned conversation serialization,
  computed statistics, conservative classification and portable filenames.
- `src/ui/extractor.ts`: standalone control panel, shared expression toolbar,
  explicit consent, operation controls and cross-tab operation lock.
- `src/exports/reconstruction.ts`: ordered, immutable message selection export.
- `src/tooling/scripts/extractor.mjs`: self-contained IIFE build with local styles and
  dependency license; no CDN or remote code.

## Important remaining limits

This is a usable **synthetic-tested prototype**, not full acceptance of the
original MVP brief or a newly published release.

- No live ChatGPT account/export was supplied or accessed during development.
  The internal endpoints/session shape may differ from the current service.
  An HTTP/schema error stops or pauses visibly instead of pretending success.
- Project **name discovery**, project-only/hidden inventory traversal, project
  instructions/files and exhaustive workspace/account discovery are not
  implemented. Project mode can only export matching IDs actually returned by
  the inventory. Archived discovery is opt-in and may be refused.
- The dashboard launches instructions, not automatic tab injection. Running
  the separate script is an explicit manual step to preserve the extension's
  offline permission boundary. It is not a Chrome Web Store integration.
- There is one recoverable operation, not a history of multiple jobs. No
  SQLite central index, streaming ZIP writer, automatic adaptive retries,
  server-side snapshots or binary attachments are claimed.
- Prototype budgets: 5,000 discovered chats per operation and 96 MiB of
  serialized conversation data per download. ZIP assembly is in memory.
  Large workloads may need narrower keyword/project exports. The normal
  import resource budgets still apply.
- Resume re-discovers and retains previously saved results for the same
  operation; it is not a live mirror and does not infer deletion. Local
  checkpoints and libraries are unencrypted. Clear each origin separately.
- Reconstruction can include sensitive content. Review it before sharing.

### Owner validation needed

Start with one synthetic conversation in your own account, then a small
title-only keyword export. Confirm the selected workspace and compare the
returned messages/branches with the source. If an endpoint/schema fails,
report only its HTTP status and the panel's generic error, not tokens, private
conversation bodies or full network logs. Broader project discovery requires a
separately verified current interface before claiming Export All coverage.
