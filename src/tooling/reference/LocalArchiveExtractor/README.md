# Owner-supplied local archive extractor

Imported on 2026-11-17 from the owner's `chatflow-extractor (1).zip`.
This is an **unmodified, unintegrated reference**, not a replacement for
ChatFlow's tested TypeScript implementation or standalone browser extractor.

The ZIP contains only:

- [chatflow_extract.py](chatflow_extract.py): a Python 3.10+ standard-library
  reader for local official-export-shaped JSON/ZIP files. It selects a
  conversation, writes JSON/CSV/Markdown reports and generates a local HTML
  context composer with filtering/selection/export controls.
- [START_CHATFLOW.cmd](START_CHATFLOW.cmd): a Windows launcher that prompts for
  an input archive and runs the Python file using `py -3`.

The script does **not** discover conversations through a live ChatGPT account.
Its browser action opens the generated local composer file. The supplied
scripts were inspected as text, **not executed**, and are not included in the
installed extension, npm scripts, test suite or distribution package.

## Important differences and limitations

- Unlike the tested product importer, this helper does not implement its ZIP
  resource budgets or strict graph/duplicate/schema validation.
- When the active path is absent, it falls back to timestamp order. Do not treat
  that as verified conversation order or complete branch recovery.
- Token counts use a character-count estimate, not a tokenizer. Timestamp
  differences, including the field named `response_latency_ms`, do not prove
  actual model generation latency.
- CSV fields are written without the product exporter's spreadsheet-formula
  protection. Treat outputs as untrusted and do not open them in a spreadsheet
  without an appropriate review.
- Output uses fixed filenames and can overwrite an existing output folder.
  The HTML composer embeds conversation content; keep it private.
- No compatibility, completeness, accessibility, independent-audit or test
  claims are made for this reference. Do not run it on private exports as a
  routine automated test.

These are observations from source inspection, not an executed security audit.
Any integration, behavioral correction or testing requires a separate scoped
task. Source bytes are retained exactly for traceability.

## Provenance

| Supplied file                | SHA-256                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `chatflow-extractor (1).zip` | `ae1f1a3d0a29ebe0aadcbf23d02cbcfbd869bac6fd3b905580b0351e39050f95` |
| `chatflow_extract.py`        | `7ca0cce9aa9684a38553a107b72ccd3214340b16a68e2badf0245a5c5336e1fd` |
| `START_CHATFLOW.cmd`         | `b7fc4d1de2364ef95631b1bd3f271cc61aa9086a98f709a5f0085c0ce8978742` |

The original ZIP stays outside the tracked repository; its two source files
are preserved here without a duplicate binary archive.
