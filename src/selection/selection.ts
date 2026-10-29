import type { Conversation } from '../shared/model';

export function selectedConversations(
  conversations: Conversation[],
  ids: ReadonlySet<string>,
): Conversation[] {
  const chats = conversations.filter((chat) => ids.has(chat.id));
  if (!chats.length) throw new Error('Select at least one chat before continuing.');
  if (chats.length !== ids.size) {
    throw new Error('Selection contains IDs absent from the source snapshot.');
  }
  return chats;
}

export function selectIds(
  current: ReadonlySet<string>,
  orderedIds: string[],
  mode: 'all' | 'first' | 'last',
  count?: number,
): Set<string> {
  if (mode !== 'all' && (!Number.isSafeInteger(count) || count === undefined || count < 1)) {
    throw new Error('Selection count must be a positive whole number.');
  }
  const ids = [...new Set(orderedIds)];
  const chosen = mode === 'all' ? ids : mode === 'first' ? ids.slice(0, count) : ids.slice(-count!);
  return new Set([...current, ...chosen]);
}
