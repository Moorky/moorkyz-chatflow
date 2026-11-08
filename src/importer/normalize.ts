import type { Conversation, Dataset, Message, Role } from '../shared/model';
import { verifiedChatUrl } from '../shared/integrity';

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function timestamp(value: unknown, warnings: string[], label: string): string | null {
  if (value === null || value === undefined) return null;
  const date =
    typeof value === 'number'
      ? new Date(value * 1000)
      : typeof value === 'string'
        ? new Date(value)
        : new Date(NaN);
  if (!Number.isFinite(date.getTime())) {
    warnings.push(`Invalid timestamp: ${label}.`);
    return null;
  }
  return date.toISOString();
}

function roleOf(value: unknown): Role {
  return value === 'user' || value === 'assistant' || value === 'system' || value === 'tool'
    ? value
    : 'unknown';
}

function normalizeChat(value: unknown, position: number): Conversation {
  const raw = record(value);
  if (!raw) throw new Error(`Conversation ${position + 1} is not an object.`);
  const warnings: string[] = [];
  const originalId = text(raw.id) ?? text(raw.conversation_id);
  const id = originalId ?? `local:conversation:${position}`;
  if (!originalId) warnings.push('Missing conversation ID; local surrogate is not an official ID.');
  const mapping = record(raw.mapping);
  if (!mapping) throw new Error(`Conversation ${id} has no supported message mapping.`);
  const nodes = new Map<string, RecordValue>();
  const children = new Map<string | null, string[]>();
  for (const [nodeId, value] of Object.entries(mapping)) {
    const node = record(value);
    if (!node) throw new Error(`Invalid graph node ${nodeId} in ${id}.`);
    nodes.set(nodeId, node);
  }
  for (const [nodeId, node] of nodes) {
    if (node.parent !== null && node.parent !== undefined && !text(node.parent)) {
      throw new Error(`Invalid parent reference at node ${nodeId} in ${id}.`);
    }
    const parent = text(node.parent);
    if (parent && !nodes.has(parent)) throw new Error(`Missing parent ${parent} in ${id}.`);
    const siblings = children.get(parent) ?? [];
    siblings.push(nodeId);
    children.set(parent, siblings);
  }

  const activeNodes = new Set<string>();
  let cursor = text(raw.current_node);
  if (cursor && !nodes.has(cursor)) throw new Error(`Unknown current_node in ${id}.`);
  while (cursor) {
    if (activeNodes.has(cursor)) throw new Error(`Cycle in conversation ${id}.`);
    activeNodes.add(cursor);
    cursor = text(nodes.get(cursor)?.parent);
  }
  if (!activeNodes.size && nodes.size) {
    warnings.push('Active branch unavailable; use All branches to inspect the exported messages.');
  }

  const messages: Message[] = [];
  const ids = new Set<string>();
  const visited = new Set<string>();
  const stack = [...(children.get(null) ?? [])].reverse();
  while (stack.length) {
    const nodeId = stack.pop()!;
    if (visited.has(nodeId)) throw new Error(`Cycle in conversation ${id}.`);
    visited.add(nodeId);
    const node = nodes.get(nodeId)!;
    const nested = children.get(nodeId) ?? [];
    for (let i = nested.length - 1; i >= 0; i--) stack.push(nested[i]!);
    if (node.message === null || node.message === undefined) continue;
    const message = record(node.message);
    if (!message) throw new Error(`Invalid message at ${nodeId}.`);
    const originalMessageId = text(message.id);
    const messageId = originalMessageId ?? `local:message:${nodeId}`;
    if (ids.has(messageId)) throw new Error(`Duplicate message ID ${messageId} in ${id}.`);
    ids.add(messageId);
    if (!originalMessageId) warnings.push(`Missing message ID at ${nodeId}; local surrogate used.`);
    const content = record(message.content);
    const parts = content?.parts;
    const strings: string[] = [];
    const attachments = new Set<string>();
    let nonText = false;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        if (typeof part === 'string') strings.push(part);
        else {
          nonText = true;
          const asset = record(part);
          const ref = text(asset?.asset_pointer);
          if (ref) attachments.add(ref);
        }
      }
    } else if (typeof content?.text === 'string') {
      strings.push(content.text);
    }
    const metadata = record(message.metadata);
    if (Array.isArray(metadata?.attachments)) {
      for (const value of metadata.attachments) {
        const attachment = record(value);
        const ref = text(attachment?.id) ?? text(attachment?.name);
        if (ref) attachments.add(ref);
      }
    }
    if (nonText || attachments.size) {
      warnings.push(`Message ${messageId}: attachment/media content is not indexed or copied.`);
    }
    if (!strings.length) warnings.push(`Message ${messageId}: text content unavailable.`);
    messages.push({
      id: messageId,
      nodeId,
      conversationId: id,
      parentId: text(node.parent),
      role: roleOf(record(message.author)?.role),
      timestamp: timestamp(message.create_time, warnings, messageId),
      text: strings.join('\n'),
      contentKind:
        nonText || attachments.size ? 'multimodal' : strings.length ? 'text' : 'unavailable',
      attachmentRefs: [...attachments],
      active: activeNodes.has(nodeId),
    });
  }
  if (visited.size !== nodes.size) throw new Error(`Disconnected cycle in conversation ${id}.`);
  const sourceUrl = raw.url ?? raw.conversation_url;
  const candidateUrl = verifiedChatUrl(sourceUrl);
  const originalUrl =
    candidateUrl && originalId && new URL(candidateUrl).pathname === `/c/${originalId}`
      ? candidateUrl
      : null;
  if (sourceUrl !== undefined && !originalUrl)
    warnings.push('Original URL is invalid or unsupported.');
  return {
    id,
    originalId,
    title: text(raw.title) ?? 'Untitled conversation',
    originalUrl,
    project: text(raw.project_name),
    createdAt: timestamp(raw.create_time, warnings, `${id} creation`),
    updatedAt: timestamp(raw.update_time, warnings, `${id} update`),
    messages,
    warnings,
  };
}

export function normalizeExport(
  segments: unknown[],
  sourceExportId: string,
  sourceName: string,
  importedAt = new Date().toISOString(),
): Dataset {
  const conversations: Conversation[] = [];
  const ids = new Set<string>();
  for (const segment of segments) {
    if (!Array.isArray(segment)) {
      throw new Error(
        'Unsupported schema: conversations.json must contain an array of conversations.',
      );
    }
    for (const value of segment) {
      const chat = normalizeChat(value, conversations.length);
      if (ids.has(chat.id)) {
        throw new Error(`Duplicate conversation ID ${chat.id}; import stopped to avoid data loss.`);
      }
      ids.add(chat.id);
      conversations.push(chat);
    }
  }
  return {
    schemaVersion: 1,
    sourceExportId,
    sourceName,
    importedAt,
    conversations,
    warnings: [
      'Local export snapshot only; this does not establish complete live-account coverage.',
    ],
  };
}
