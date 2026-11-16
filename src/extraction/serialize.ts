import { wordCount } from '../analytics/statistics';
import { normalizeExport } from '../importer/normalize';
import { object } from './chatgpt';
import type { Conversation } from '../shared/model';

export function exportFilename(title: string, startTime: string, id: string): string {
  const date = new Date(startTime);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid extraction start time.');
  let name = [
    ...title
      .normalize('NFC')
      .replace(/[<>:"/\\|?*\p{Cc}]/gu, '-')
      .replace(/\s+/gu, '-'),
  ]
    .slice(0, 80)
    .join('')
    .replace(/^[. -]+|[. -]+$/g, '');
  if (!name) name = 'Untitled';
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name)) name = `_${name}`;
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id)) throw new Error('Invalid export conversation ID.');
  const suffix = `_${date.toISOString().slice(0, 19).replace(/[T:]/g, '-')}_${id}.json`;
  const encoder = new TextEncoder();
  while (encoder.encode(name + suffix).length > 240) name = [...name].slice(0, -1).join('');
  return name + suffix;
}

export function classifyContent(text: string, contentKind: string, attachments: string[]) {
  const types = new Set<string>();
  const blocks: { type: string; content: string; language?: string }[] = [];
  if (text) types.add('raw');
  for (const match of text.matchAll(/```([^\n`]*)\n([\s\S]*?)```/g)) {
    types.add('code');
    const language = match[1]!.trim().toLowerCase();
    if (/^[a-z0-9#+.-]+$/.test(language)) types.add(`code.${language}`);
    blocks.push({ type: 'code', content: match[2]!, ...(language ? { language } : {}) });
  }
  const signals: [RegExp, string][] = [
    [/^#{1,6}\s+\S/m, 'heading'],
    [/^\s*(?:[-*+]|\d+\.)\s+\S/m, 'list'],
    [/^\s*\|.+\|\s*$/m, 'table'],
    [/`[^`\n]+`/, 'inline.code'],
    [/!?\[[^\]]*\]\(https?:\/\/[^)]+\)/, 'inline.link'],
    [/\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]/, 'math'],
  ];
  for (const [pattern, type] of signals) if (pattern.test(text)) types.add(type);
  if ([...types].some((type) => type !== 'raw')) types.add('markdown');
  if (attachments.length) types.add('attachment');
  if (contentKind !== 'text') types.add('unknown');
  return { contentTypes: [...types], blocks };
}

export function serializeConversation(
  raw: Record<string, unknown>,
  exportId: string,
  startTime: string,
  chat: Conversation = normalizeExport([[raw]], 'direct', 'ChatGPT direct response', startTime)
    .conversations[0]!,
) {
  const mapping = object(raw.mapping);
  const counts: Record<string, number> = {};
  const messages = chat.messages.map((message, index) => {
    const source = object(object(mapping[message.nodeId]).message);
    const classification = classifyContent(
      message.text,
      message.contentKind,
      message.attachmentRefs,
    );
    for (const type of classification.contentTypes) counts[type] = (counts[type] ?? 0) + 1;
    const previous = chat.messages[index - 1];
    return {
      id: message.id,
      index,
      nodeId: message.nodeId,
      parentNodeId: message.parentId,
      active: message.active,
      role: message.role,
      author: source.author ?? null,
      timestamp: message.timestamp,
      durationSincePreviousMessageMs:
        previous?.timestamp && message.timestamp
          ? Date.parse(message.timestamp) - Date.parse(previous.timestamp)
          : null,
      content: message.text,
      ...classification,
      statistics: {
        characterCount: [...message.text].length,
        wordCount: wordCount(message.text),
        contentSizeBytes: new TextEncoder().encode(message.text).length,
        estimatedTokenCount: null,
      },
      attachments: message.attachmentRefs.map((reference) => ({
        reference,
        retrievalStatus: 'not-requested',
      })),
      // Preserve unsupported parts, citations, tool and model metadata verbatim.
      source: source,
    };
  });
  const filename = exportFilename(chat.title, startTime, chat.id);
  return {
    schemaVersion: '1.0.0',
    exportId,
    startTime,
    filename,
    source: {
      provider: 'chatgpt',
      url: chat.originalUrl,
      conversationId: chat.id,
      exportMethod: 'direct-experimental',
    },
    conversation: {
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      projectId: typeof raw.gizmo_id === 'string' ? raw.gizmo_id : null,
      projectName: chat.project,
      archived: typeof raw.is_archived === 'boolean' ? raw.is_archived : null,
      activeBranchId: typeof raw.current_node === 'string' ? raw.current_node : null,
    },
    statistics: {
      messageCount: messages.length,
      userMessageCount: messages.filter((message) => message.role === 'user').length,
      assistantMessageCount: messages.filter((message) => message.role === 'assistant').length,
      characterCount: messages.reduce((sum, message) => sum + message.statistics.characterCount, 0),
      wordCount: messages.reduce((sum, message) => sum + message.statistics.wordCount, 0),
      contentSizeBytes: messages.reduce(
        (sum, message) => sum + message.statistics.contentSizeBytes,
        0,
      ),
      estimatedTokenCount: null,
      contentTypes: counts,
    },
    messages,
    exportResult: {
      status: 'extracted',
      completeness: 'unverified',
      warnings: [
        ...chat.warnings,
        'The returned graph was structurally validated, but the service may omit inaccessible content. No account-wide completeness is claimed. Attachment binaries were not retrieved.',
      ],
      errors: [],
    },
    endTime: new Date().toISOString(),
  };
}
