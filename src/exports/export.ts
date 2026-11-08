import { strToU8, zipSync } from 'fflate';
import { statistics } from '../analytics/statistics';
import { sha256 } from '../shared/integrity';
import { branchMessages } from '../shared/model';
import { selectedConversations } from '../selection/selection';
import type {
  BranchPolicy,
  Conversation,
  Dataset,
  ExportFormat,
  SearchOptions,
} from '../shared/model';

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return replacements[char]!;
  });
}

export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  let first = 0;
  while (first < text.length && (text.charCodeAt(first) <= 32 || /\s/u.test(text[first]!))) first++;
  const formula =
    '=+-@'.includes(text[first] ?? '\0') || ['\t', '\r', '\n'].includes(text[0] ?? '');
  const safe = formula ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function csv(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function htmlDocument(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:16px/1.6 system-ui;max-width:80rem;margin:2rem auto;padding:1rem}pre{white-space:pre-wrap;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:.5rem;text-align:left}a{color:#3535b0}section{break-before:page}</style></head><body>${body}</body></html>`;
}

function chatIndex(chats: Conversation[]): string {
  return `<h2>All selected chats</h2><ul>${chats
    .map(
      (chat, index) =>
        `<li><a href="#chat-${index}">${escapeHtml(chat.title)}</a> (${escapeHtml(chat.id)}) &mdash; ${
          chat.originalUrl
            ? `<a href="${escapeHtml(chat.originalUrl)}" rel="noreferrer noopener">Source URL from export (access not checked)</a>`
            : 'Original URL not supplied; no link fabricated.'
        }</li>`,
    )
    .join('')}</ul>`;
}

function chatContent(chats: Conversation[], format: ExportFormat, branching: BranchPolicy): string {
  if (format === 'json') {
    return JSON.stringify(
      {
        schema_version: 1,
        branching,
        conversations: chats.map((chat) => ({
          ...chat,
          messages: branchMessages(chat, branching),
        })),
      },
      null,
      2,
    );
  }
  if (format === 'csv') {
    const rows: unknown[][] = [
      [
        'record_type',
        'chat_id',
        'chat_title',
        'chat_url',
        'project',
        'message_id',
        'role',
        'timestamp_utc',
        'text',
        'content_kind',
        'coverage_warnings',
      ],
    ];
    for (const chat of chats) {
      rows.push([
        'chat',
        chat.id,
        chat.title,
        chat.originalUrl,
        chat.project,
        '',
        '',
        '',
        '',
        '',
        chat.warnings.join('; '),
      ]);
      for (const message of branchMessages(chat, branching)) {
        rows.push([
          'message',
          chat.id,
          chat.title,
          chat.originalUrl,
          chat.project,
          message.id,
          message.role,
          message.timestamp,
          message.text,
          message.contentKind,
          '',
        ]);
      }
    }
    return csv(rows);
  }
  if (format === 'txt') {
    return chats
      .map(
        (chat) =>
          `# ${chat.title}\nChat ID: ${chat.id}\nURL: ${chat.originalUrl ?? 'Unavailable'}\nWarnings: ${chat.warnings.join('; ') || 'None'}\n\n` +
          branchMessages(chat, branching)
            .map((m) => `[${m.role} | ${m.timestamp ?? 'Unknown time'} | ${m.id}]\n${m.text}`)
            .join('\n\n'),
      )
      .join('\n\n========================================\n\n');
  }
  return htmlDocument(
    'ChatFlow conversation export',
    `<h1>MOORKYZ ChatFlow</h1><p>Local export snapshot. Branch policy: ${branching}. Media files are not included.</p>${chatIndex(chats)}${chats
      .map(
        (chat, index) =>
          `<section id="chat-${index}"><h2>${escapeHtml(chat.title)}</h2><p>${escapeHtml(chat.warnings.join('; '))}</p>${branchMessages(
            chat,
            branching,
          )
            .map(
              (m) =>
                `<article><h3>${escapeHtml(m.role)} / ${escapeHtml(m.timestamp ?? 'Unknown time')}</h3><p>Message ID: ${escapeHtml(m.id)}</p><pre>${escapeHtml(m.text)}</pre></article>`,
            )
            .join('')}</section>`,
      )
      .join('')}`,
  );
}

function statisticsContent(
  chats: Conversation[],
  branching: BranchPolicy,
  format: ExportFormat,
): string {
  const report = statistics(chats, branching);
  if (format === 'json') return JSON.stringify({ schema_version: 1, ...report }, null, 2);
  if (format === 'txt') return JSON.stringify(report, null, 2);
  if (format === 'csv') {
    return csv([
      [
        'record_type',
        'chat_id',
        'title',
        'chat_url',
        'project',
        'messages',
        'words',
        'characters_codepoints',
        'mean_words',
        'weighted_mean_words',
        'mean_of_chat_means',
        'first_message_utc',
        'last_message_utc',
        'missing_timestamps',
        'user',
        'assistant',
        'system',
        'tool',
        'unknown',
        'warnings',
      ],
      [
        'aggregate',
        '',
        '',
        '',
        '',
        report.messages,
        report.words,
        '',
        '',
        report.weightedMeanWords,
        report.meanOfChatMeans,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
      ...report.sources.map((s) => [
        'chat',
        s.id,
        s.title,
        s.url,
        s.project,
        s.messages,
        s.words,
        s.characters,
        s.meanWords,
        '',
        '',
        s.firstMessageAt,
        s.lastMessageAt,
        s.missingTimestamps,
        s.roles.user,
        s.roles.assistant,
        s.roles.system,
        s.roles.tool,
        s.roles.unknown,
        s.warnings.join('; '),
      ]),
    ]);
  }
  return htmlDocument(
    'ChatFlow statistics',
    `<h1>MOORKYZ ChatFlow statistics</h1><p>Algorithm: ${report.algorithm}. Branch policy: ${branching}. Full selected chats, not just search hits; missing data is not zero activity.</p><p>${report.chats} chats; ${report.messages} messages; ${report.words} words.</p><p>Weighted mean: ${report.weightedMeanWords ?? 'Unknown'} words/message (${report.messages} messages). Mean of chat means: ${report.meanOfChatMeans ?? 'Unknown'} (${report.sources.filter((s) => s.messages).length} nonempty chats).</p>${chatIndex(chats)}${report.sources
      .map(
        (s, i) =>
          `<section id="chat-${i}"><h2>${escapeHtml(s.title)}</h2><p>ID: ${escapeHtml(s.id)} / Project: ${escapeHtml(s.project ?? 'Unknown')}</p><p>${s.messages} messages / ${s.words} words / ${s.characters} codepoints</p><p>First: ${escapeHtml(s.firstMessageAt ?? 'Unknown')}; last: ${escapeHtml(s.lastMessageAt ?? 'Unknown')}; missing timestamps: ${s.missingTimestamps}</p><p>Roles: ${escapeHtml(JSON.stringify(s.roles))}</p><p>${escapeHtml(s.warnings.join('; '))}</p></section>`,
      )
      .join('')}`,
  );
}

export async function exportBundle(
  dataset: Dataset,
  ids: ReadonlySet<string>,
  branching: BranchPolicy,
  format: ExportFormat,
  kind: 'conversations' | 'statistics',
  filter: SearchOptions | null,
): Promise<{ bytes: Uint8Array; filename: string; manifest: Record<string, unknown> }> {
  const chats = selectedConversations(dataset.conversations, ids);
  const body =
    kind === 'conversations'
      ? chatContent(chats, format, branching)
      : statisticsContent(chats, branching, format);
  const file = `${kind}.${format}`;
  const bytes = strToU8(body);
  const messageCount = chats.reduce((sum, chat) => sum + branchMessages(chat, branching).length, 0);
  const manifest = {
    schemaVersion: 1,
    producer: 'MOORKYZ ChatFlow',
    importedAt: dataset.importedAt,
    exportedAt: new Date().toISOString(),
    sourceFingerprint: dataset.sourceExportId,
    sourceName: dataset.sourceName,
    selection: {
      chatIds: chats.map((chat) => chat.id),
      timezone: 'UTC',
      filter,
      queryFingerprint: await sha256(strToU8(JSON.stringify(filter))),
      messagePolicy:
        'all messages in selected chats under branch policy; search filters do not truncate exports',
    },
    branching,
    counts: {
      importedChats: dataset.conversations.length,
      selectedChats: chats.length,
      exportedChats: chats.length,
      exportedMessages: messageCount,
      errors: 0,
    },
    files: [{ path: file, sha256: await sha256(bytes), size: bytes.length }],
    warnings: [
      ...dataset.warnings,
      'Normalized text export, not a byte-for-byte account backup. Keep the original source archive.',
      ...chats.flatMap((chat) => chat.warnings),
    ],
  };
  const archive = zipSync({
    [file]: bytes,
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'README.txt': strToU8(
      'MOORKYZ ChatFlow - sensitive local export\nAll selected chats are included. No live-account completeness is implied.\nOriginal URLs are source-validated, not network-checked. No media binaries are copied.\nCSV formula-like values are prefixed with an apostrophe; JSON retains exact source text.\nVerify content hashes against manifest.json. Do not share without reviewing private content.\n',
    ),
  });
  return { bytes: archive, filename: `chatflow-${kind}-${format}.zip`, manifest };
}
