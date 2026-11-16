import { strToU8, zipSync } from 'fflate';
import { sha256 } from '../shared/integrity';
import type { Dataset } from '../shared/model';

export interface MessageReference {
  chatId: string;
  messageId: string;
}

export async function reconstructMessages(
  dataset: Dataset,
  selected: MessageReference[],
  title: string,
) {
  if (!selected.length) throw new Error('Choose at least one message to reconstruct.');
  if (!title.trim()) throw new Error('Enter a reconstruction title.');
  const conversations = new Map(dataset.conversations.map((chat) => [chat.id, chat]));
  const messages = new Map(
    dataset.conversations.map((chat) => [
      chat.id,
      new Map(chat.messages.map((message) => [message.id, message])),
    ]),
  );
  const seen = new Set<string>();
  const segments = selected.map((reference, index) => {
    const key = JSON.stringify([reference.chatId, reference.messageId]);
    if (seen.has(key)) throw new Error('Duplicate reconstruction message.');
    seen.add(key);
    const chat = conversations.get(reference.chatId);
    const message = messages.get(reference.chatId)?.get(reference.messageId);
    if (!chat || !message)
      throw new Error('A selected message is no longer in this local snapshot.');
    return {
      index,
      provenance: {
        sourceExportId: dataset.sourceExportId,
        conversationId: chat.id,
        conversationTitle: chat.title,
        originalUrl: chat.originalUrl,
        messageId: message.id,
        nodeId: message.nodeId,
        parentNodeId: message.parentId,
      },
      role: message.role,
      timestamp: message.timestamp,
      content: message.text,
      contentKind: message.contentKind,
      attachmentRefs: message.attachmentRefs,
    };
  });
  const document = {
    schemaVersion: '1.0.0',
    kind: 'reconstruction',
    title: title.trim(),
    createdAt: new Date().toISOString(),
    messageCount: segments.length,
    ordering:
      'explicit selection order; original parent relationships remain provenance, not a new conversation graph',
    warnings: [
      'Selected segments only, not a complete conversation. Source snapshots are unchanged. Attachment binaries are not included.',
    ],
    segments,
  };
  const bytes = strToU8(JSON.stringify(document, null, 2));
  const manifest = strToU8(
    JSON.stringify(
      {
        schemaVersion: 1,
        sourceFingerprint: dataset.sourceExportId,
        files: [{ path: 'reconstruction.json', sha256: await sha256(bytes), size: bytes.length }],
      },
      null,
      2,
    ),
  );
  return zipSync({ 'reconstruction.json': bytes, 'manifest.json': manifest });
}
