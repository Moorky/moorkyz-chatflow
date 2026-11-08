import { verifiedChatUrl } from '../shared/integrity';
import type { Dataset } from '../shared/model';

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function nullableText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((part) => typeof part === 'string');
}
function time(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === 'string' &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString() === value)
  );
}

export function validDataset(value: unknown): value is Dataset {
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    typeof value.sourceExportId !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.sourceExportId) ||
    typeof value.sourceName !== 'string' ||
    typeof value.importedAt !== 'string' ||
    !time(value.importedAt) ||
    !strings(value.warnings) ||
    !Array.isArray(value.conversations)
  )
    return false;
  const chatIds = new Set<string>();
  for (const chat of value.conversations) {
    if (
      !object(chat) ||
      typeof chat.id !== 'string' ||
      !chat.id ||
      chatIds.has(chat.id) ||
      !nullableText(chat.originalId) ||
      typeof chat.title !== 'string' ||
      !nullableText(chat.originalUrl) ||
      (chat.originalUrl !== null &&
        (typeof chat.originalId !== 'string' ||
          !chat.originalId ||
          verifiedChatUrl(chat.originalUrl) !== chat.originalUrl ||
          new URL(chat.originalUrl).pathname !== `/c/${chat.originalId}`)) ||
      !nullableText(chat.project) ||
      !time(chat.createdAt) ||
      !time(chat.updatedAt) ||
      !strings(chat.warnings) ||
      !Array.isArray(chat.messages)
    )
      return false;
    chatIds.add(chat.id);
    const messageIds = new Set<string>();
    for (const message of chat.messages) {
      if (
        !object(message) ||
        typeof message.id !== 'string' ||
        !message.id ||
        messageIds.has(message.id) ||
        typeof message.nodeId !== 'string' ||
        message.conversationId !== chat.id ||
        !nullableText(message.parentId) ||
        typeof message.role !== 'string' ||
        !['user', 'assistant', 'system', 'tool', 'unknown'].includes(message.role) ||
        !time(message.timestamp) ||
        typeof message.text !== 'string' ||
        typeof message.contentKind !== 'string' ||
        !['text', 'multimodal', 'unavailable'].includes(message.contentKind) ||
        !strings(message.attachmentRefs) ||
        typeof message.active !== 'boolean'
      )
        return false;
      messageIds.add(message.id);
    }
  }
  return true;
}
