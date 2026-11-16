# moorkyz-chatflow — v1.0.0 MVP Implementation & UI/UX Refurbishment

## 1. Objective
Prepare **v1.0.0 as the initial MVP release** of moorkyz-chatflow.

Refurbish the existing UI/UX, improve the application's architecture where necessary, and implement a high-performance ChatGPT conversation extraction and export system.

The goal is to make moorkyz-chatflow a professional, intuitive, and efficient application for collecting, organizing, filtering, analyzing, and reconstructing AI conversations without unnecessary limitations or complicated workflows.

## 2. UI/UX Refurbishment
Completely review and improve the existing UI/UX to make the application feel more sophisticated, professionally engineered, and visually consistent with the moorkyz ecosystem.

Use the following repositories as design and implementation references:

- `moorkyz-site`
- `moorkyz-evidence`
- `moorkyz-cards`
Do not simply copy their interfaces. Identify their strongest design patterns, components, interactions, and architectural decisions and adapt them to the specific purpose of moorkyz-chatflow.

### Design principles

- Modern, minimalistic, and polished.
- Clear visual hierarchy and consistent spacing.
- Professional typography and iconography.
- Responsive layouts.
- Subtle, purposeful animations and transitions.
- Consistent component behavior throughout the application.
- Tooltips and contextual guidance where genuinely useful.
- Avoid unnecessary visual noise, excessive cards, and decorative components that do not provide functional value.
The dashboard should be **simply functional, with brilliant feature implementations**.

Its primary purpose is not to display as much information as possible, but to make the most important workflows immediately accessible and understandable.

Prioritize functionality, usability, discoverability, and efficiency over visual complexity.

## 3. Dashboard
The dashboard should provide immediate access to the application's core functionality:

- Import conversations.
- Export conversations directly from ChatGPT.
- Browse and search existing conversations.
- Filter and categorize conversations and individual messages.
- Review conversation statistics and metadata.
- Reconstruct or combine selected conversation segments.
- Access recent exports and ongoing operations.
Implement a unified operation manager that displays active, completed, paused, failed, and cancelled operations.

Long-running operations should provide useful progress information, including:

- Current operation and processing stage.
- Conversations discovered.
- Conversations processed.
- Messages extracted.
- Conversations remaining.
- Elapsed time.
- Estimated remaining time, when reliably calculable.
- Errors, warnings, and incomplete exports.
The user should always understand what the application is currently doing without being overwhelmed by technical details.

## 4. Direct ChatGPT Export Engine
Importing the official ChatGPT data export is apparently already implemented.

However, requesting an official export introduces an unnecessary dependency on OpenAI's email delivery and export preparation process. Depending on the circumstances, the user may have to wait a considerable amount of time before the export becomes available.

Implement an additional **direct conversation extraction engine** that allows users to export their own ChatGPT conversations through their authenticated browser session without waiting for an official account export.

The existing official export importer should remain available and continue to be supported.

### Implementation requirements
Develop a standalone, reusable extraction script that can also be invoked through the application's dashboard.

The implementation should:

- Reuse the user's existing authenticated browser session where technically possible.
- Avoid requiring users to manually extract or provide authentication tokens.
- Support automated conversation discovery and extraction.
- Minimize browser navigation and redundant operations.
- Extract complete accessible conversations, not merely currently visible messages.
- Handle lazy loading, pagination, conversation branches, and dynamically rendered content where accessible.
- Detect incomplete extraction attempts.
- Support resumable operations.
- Respect authentication boundaries, platform restrictions, and rate limits.
- Store all extracted information locally by default.
Keep the extraction layer modular so that changes to ChatGPT's interface or data structure do not require extensive changes to the rest of the application.

## 5. Export Modes
Implement four primary export modes using the same underlying extraction and serialization engine.

### 5.1. Export Single Chat
Export an entire conversation from beginning to end.

The user should be able to provide:

- A ChatGPT conversation URL.
- A conversation selected through the application's conversation browser.
- The currently opened conversation, when available through the browser integration.
Extract all accessible messages from both the user and assistant, including associated metadata, content types, and available attachments or references.

### 5.2. Export by Keywords
Discover and export all conversations matching a user-defined search condition.

Support two search scopes:

- **Title only**
- **Title and message content**
The user must be able to choose the desired scope before executing the operation.

Implement a lightweight search expression syntax supporting at least:

ExpressionDescription`moorkyz`Case-insensitive keyword match`moorkyz*`Prefix wildcard`*evidence*`Contains wildcard`"agentic heaven"`Exact phrase`moorkyz AND evidence`Both expressions must match`evidence OR chatflow`Either expression may match`moorkyz NOT test`Exclude matching conversations`(evidence OR chatflow) AND MVP`Grouped conditionsSearch expressions should be validated before execution.

Provide an optional preview of matching conversations before starting the export.

Optimize title-only searches so that the application does not unnecessarily extract entire conversations just to evaluate their titles.

For title and message searches, reuse previously indexed or extracted content wherever possible.

### 5.3. Export Project
Export all accessible conversations belonging to a specific ChatGPT project.

The user should be able to enter a project name or select a discovered project from a list.

The application must:

1. Resolve the project.
2. Discover its associated conversations.
3. Export each conversation individually.
4. Preserve available project metadata and conversation-to-project associations.
5. Generate a project-level manifest containing all exported conversations.
Do not rely exclusively on conversation titles to determine project membership.

Project exports should optionally include project instructions and accessible project file references, clearly separated from the conversation data.

### 5.4. Export All
Implement an **Export All** operation that discovers and exports every accessible conversation within the authenticated ChatGPT account and selected workspace.

The operation must support:

- Regular conversations.
- Archived conversations, where accessible.
- Project conversations.
- Conversation branches, where accessible.
- Deduplication across discovery sources.
- Automatic checkpoints and recovery.
- Incremental exports.
- Cancellation and resumption.
- Configurable extraction concurrency.
The operation should not fail entirely because of a single inaccessible or malformed conversation.

Instead, continue processing the remaining conversations and provide a comprehensive summary of skipped, failed, incomplete, and successfully exported conversations.

## 6. Unified Export Lifecycle
All four export modes must follow the same standardized lifecycle.

1. Initialize the export operation and record its `startTime`.
2. Resolve the selected export mode and search conditions.
3. Discover matching conversations.
4. Deduplicate conversations using their unique identifiers.
5. Initialize each conversation export and record its individual `startTime`.
6. Resolve conversation metadata.
7. Construct the output filename.
8. Extract messages and associated content.
9. Normalize and classify the extracted data.
10. Calculate conversation and message statistics.
11. Validate completeness and structural integrity.
12. Serialize the conversation.
13. Record the conversation's `endTime`.
14. Finalize the output file atomically.
15. Update the operation manifest.
16. Finalize the overall operation and record its `endTime`.
The sequence should be optimized to minimize unnecessary processing, memory consumption, disk operations, network requests, and browser interactions.

## 7. File Naming Convention
Every conversation must be exported into an individual JSON file.

Use the following standardized filename format:

`<Title-With-No-Spaces>_<yyyy-MM-dd-HH-mm-ss>_<Conversation-UUID>.json`

Example:

`moorkyz-chatflow-MVP-Planning_2026-11-13-06-46-00_550e8400-e29b-41d4-a716-446655440000.json`

Requirements:

- Replace whitespace with hyphens.
- Remove or normalize characters that are invalid in filenames.
- Preserve the original, unmodified title inside the JSON.
- Include the conversation identifier extracted from its URL.
- Use the individual conversation export start timestamp for the filename.
- Ensure compatibility across Windows, macOS, and Linux.
- Prevent accidental overwriting of existing exports.
- Retain deterministic identifiers to support deduplication and incremental exports.
Use underscores instead of literal asterisks as separators because asterisks are invalid filename characters on Windows.

Use the standard `.json` extension.

## 8. Conversation JSON Structure
Design a versioned, normalized JSON structure that is optimized for processing, readability, indexing, filtering, extensibility, and conversation reconstruction.

Metadata and summary information should appear first, followed by the complete message collection. Export completion information should appear at the end.

Example:

```
{
  "schemaVersion": "1.0.0",
  "exportId": "unique-export-id",
  "startTime": "2026-11-13T05:46:00.000Z",
  "filename": "moorkyz-chatflow-MVP_2026-11-13-06-46-00_550e8400-e29b-41d4-a716-446655440000.json",
  "source": {
    "provider": "chatgpt",
    "url": "https://chatgpt.com/c/550e8400-e29b-41d4-a716-446655440000",
    "conversationId": "550e8400-e29b-41d4-a716-446655440000",
    "exportMethod": "direct"
  },
  "conversation": {
    "title": "moorkyz-chatflow MVP",
    "createdAt": null,
    "updatedAt": null,
    "projectId": null,
    "projectName": null,
    "archived": false,
    "activeBranchId": null
  },
  "statistics": {
    "messageCount": 2,
    "userMessageCount": 1,
    "assistantMessageCount": 1,
    "characterCount": 143,
    "wordCount": 24,
    "contentSizeBytes": 143,
    "estimatedTokenCount": null,
    "conversationDurationMs": null,
    "contentTypes": {
      "raw": 1,
      "markdown": 1
    }
  },
  "messages": [
    {
      "id": "message-001",
      "index": 0,
      "parentId": null,
      "role": "user",
      "author": "user",
      "timestamp": null,
      "durationSincePreviousMessageMs": null,
      "content": "Implement the ChatGPT export engine.",
      "contentTypes": ["raw"],
      "statistics": {
        "characterCount": 36,
        "wordCount": 5
      },
      "blocks": [],
      "attachments": []
    },
    {
      "id": "message-002",
      "index": 1,
      "parentId": "message-001",
      "role": "assistant",
      "author": "assistant",
      "timestamp": null,
      "durationSincePreviousMessageMs": null,
      "content": "## Implementation\n\nThe export engine should use a modular architecture.",
      "contentTypes": ["markdown", "heading"],
      "statistics": {
        "characterCount": 71,
        "wordCount": 10
      },
      "blocks": [],
      "attachments": []
    }
  ],
  "exportResult": {
    "status": "completed",
    "completeness": "verified",
    "warnings": [],
    "errors": []
  },
  "endTime": "2026-11-13T05:46:02.000Z"
}
```
This example illustrates the intended structure. All actual statistics must be calculated from the extracted content rather than copied from example values.

### Timestamp requirements
Distinguish between:

- Conversation creation time.
- Conversation modification time.
- Individual message timestamps.
- Export operation start and end times.
- Individual conversation extraction start and end times.
- Time elapsed between consecutive messages.
Use ISO 8601 timestamps internally, preferably UTC.

Display localized timestamps in the UI.

Never substitute extraction timestamps for unavailable original message timestamps. Missing information must be represented explicitly using `null` or an appropriate availability indicator.

The time difference between two consecutive messages must not automatically be interpreted as actual model generation time.

## 9. Message Extraction and Content Classification
Extract as much accessible information as possible from every individual message.

Each message should contain:

- Unique message identifier.
- Original position.
- Parent and branch relationships.
- Author and role.
- Original timestamp.
- Time difference from the preceding message.
- Original or normalized message content.
- Character count.
- Word count.
- Estimated token count, where available.
- Content types.
- Structured content blocks.
- Attachment metadata.
- References and citations.
- Available model or generation metadata.
Preserve the original message content while additionally generating a structured representation for advanced filtering and reconstruction.

### Content type system
Implement an extensible, hierarchical content classification system.

CategoryExamples`raw`Plain text`markdown`Markdown-formatted content`heading`Markdown headings`list`Ordered, unordered, and checklist content`table`Structured tables`code`Code blocks, scripts, source files`inline`Inline code, citations, entities, links, interactive components`math`Inline and block mathematical expressions`graphic`Charts, diagrams, visualizations`image`Uploaded and generated images`audio`Audio files, voice recordings`video`Video files and references`document`PDF, DOCX, TXT, and other documents`spreadsheet`XLSX, CSV, structured spreadsheet data`presentation`PPTX and presentation artifacts`artifact`Generated or editable artifacts`tool`Accessible tool calls and tool results`interactive`Forms, widgets, interactive visualizations`unknown`Content that cannot yet be classifiedSupport more specific subtypes where possible, for example:

- `code.powershell`
- `code.typescript`
- `inline.citation`
- `inline.entity`
- `inline.link`
- `graphic.chart`
- `graphic.diagram`
- `document.pdf`
- `artifact.writing`
- `interactive.form`
A message can contain multiple content types.

The conversation-level statistics must aggregate all message-level content types and counts.

Unknown or unsupported content should be preserved where accessible rather than silently discarded.

Keep attachment references separate from actual attachment binaries. If an attachment cannot be retrieved, preserve its available metadata and explicitly indicate its retrieval status.

## 10. Performance Optimization
Performance is a central requirement of this implementation.

The objective is to make direct conversation export as fast as reasonably possible while preserving accuracy, completeness, and reliability.

Do not implement an unnecessarily slow browser automation workflow that opens every conversation sequentially, waits for arbitrary durations, and performs redundant DOM operations.

Instead, evaluate and implement the most efficient supported extraction strategy.

### Optimization priorities

- Discover conversation identifiers before extracting full conversations.
- Separate metadata discovery from content extraction.
- Filter titles before retrieving conversation contents.
- Avoid redundant extraction of previously processed conversations.
- Reuse authenticated browser sessions.
- Implement bounded parallel processing.
- Reuse cached metadata and search indexes.
- Avoid fixed sleep intervals when event-driven readiness checks are possible.
- Process content classification and statistical calculations during extraction where practical.
- Avoid repeatedly parsing the same message content.
- Use streaming or incremental serialization for exceptionally large conversations.
- Avoid embedding large attachment binaries directly into conversation JSON files.
- Use atomic writes and lightweight checkpoints.
- Implement adaptive throttling and retry strategies.
- Detect rate limits and authentication failures instead of aggressively retrying.
- Optimize memory consumption for exports containing thousands of conversations.
Benchmark alternative approaches and select the most efficient reliable implementation rather than assuming that a particular extraction method is optimal.

### Incremental export
After the initial export, subsequent operations should be able to detect:

- New conversations.
- Modified conversations.
- Previously incomplete conversations.
- Already exported, unchanged conversations.
Unchanged conversations should be skipped unless the user explicitly requests a complete re-export.

The system should retain enough metadata to identify changes without unnecessarily extracting the entire conversation again.

## 11. Export Directory Structure
Organize export operations using a predictable structure.

```
exports/
├── 2026-11-13-06-46-00/
│   ├── manifest.json
│   ├── conversations/
│   │   ├── moorkyz-chatflow-MVP_2026-11-13-06-46-00_<uuid>.json
│   │   └── AgenticHeaven_2026-11-13-06-46-02_<uuid>.json
│   ├── attachments/
│   ├── projects/
│   ├── logs/
│   └── checkpoints/
└── index.sqlite
```
The operation manifest should contain:

- Export operation identifier.
- Export mode.
- Search expression and search scope, if applicable.
- Project information, if applicable.
- Overall start and end times.
- Total discovered conversations.
- Successfully exported conversations.
- Skipped conversations.
- Failed or incomplete conversations.
- Total extracted messages.
- Total exported data size.
- Processing duration.
- References to individual conversation files.
- Recovery and checkpoint information.
The central index should enable efficient searching, deduplication, incremental updates, and reconstruction across multiple export operations.

## 12. Filtering and Conversation Reconstruction
The extraction system must integrate seamlessly with moorkyz-chatflow's existing conversation processing functionality.

Users should be able to filter extracted conversations and individual messages by:

- Conversation title.
- Message content.
- Date and time.
- Author or role.
- Content type and subtype.
- Message length.
- Project.
- Conversation identifier.
- Message position.
- Available model metadata.
- Attachments and artifacts.
Support combining selected messages or conversation segments into a new, structured output.

This should make it possible to reconstruct relevant conversation context from multiple conversations without having to manually copy, edit, or reassemble large amounts of content.

Preserve provenance so that every reconstructed segment can be traced back to its original conversation and message.

Do not modify or overwrite the original extracted conversations during filtering or reconstruction.

## 13. Reliability, Validation, and Testing
Implement comprehensive validation and automated tests.

At minimum, verify:

- All four export modes.
- Search expression parsing and evaluation.
- Conversation discovery and pagination.
- Complete message extraction.
- Conversation branch preservation.
- Timestamp normalization.
- Content classification.
- Attachment references.
- Statistical calculations.
- Cross-platform filename generation.
- JSON schema validation.
- Duplicate detection.
- Incremental exports.
- Interrupted operation recovery.
- Cancellation and resumption.
- Authentication expiration.
- Rate-limit handling.
- Large conversation processing.
- Large-scale account exports.
- Compatibility with the existing official ChatGPT export importer.
Use synthetic fixtures for deterministic automated testing and optional user-authorized browser integration tests for actual extraction workflows.

Explicitly distinguish between fully extracted conversations and conversations whose completeness cannot be verified.

An export must never be marked as verified or complete solely because the extraction script reached the end of the currently rendered content.

## 14. MVP Release Criteria
Version 1.0.0 should be considered ready when:

- The refurbished UI is visually consistent, responsive, and functionally polished.
- The dashboard provides efficient access to all core workflows.
- The existing official ChatGPT export importer remains functional.
- All four direct extraction modes are implemented.
- Exported conversations follow a documented, validated JSON schema.
- Message-level and conversation-level statistics are available.
- Content type classification is functional and extensible.
- Large export operations support checkpoints, cancellation, recovery, and incremental execution.
- Extracted conversations can be searched, filtered, categorized, and reconstructed.
- Errors and extraction limitations are transparently communicated.
- Automated tests cover the core extraction and processing workflows.
- Documentation includes setup instructions, a quick tour, usage examples, architecture documentation, export schema documentation, and known limitations.

## 15. Final Implementation Directive
Review the existing repository before making architectural changes.

Preserve functional implementations, improve weak or incomplete components, and avoid unnecessary rewrites.

Use the existing moorkyz ecosystem as the design reference while ensuring that moorkyz-chatflow remains independently maintainable.

The result should not merely be a visually refurbished chat viewer or another basic conversation exporter.

It should establish moorkyz-chatflow as a **high-performance conversation management, extraction, and reconstruction platform** with a straightforward user experience and a solid technical foundation for future development.

Keep the v1.0.0 scope focused on a complete, reliable MVP. More advanced functionality should be enabled by the architecture without unnecessarily delaying the initial release.