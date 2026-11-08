import type { Statistics } from '../analytics/statistics';

export type Role = 'user' | 'assistant' | 'system' | 'tool' | 'unknown';
export type BranchPolicy = 'active-path' | 'all-branches';
export type SearchScope = 'message' | 'conversation';
export type ExportFormat = 'json' | 'txt' | 'csv' | 'html';

export interface Message {
  id: string;
  nodeId: string;
  conversationId: string;
  parentId: string | null;
  role: Role;
  timestamp: string | null;
  text: string;
  contentKind: 'text' | 'multimodal' | 'unavailable';
  attachmentRefs: string[];
  active: boolean;
}

export interface Conversation {
  id: string;
  originalId: string | null;
  title: string;
  originalUrl: string | null;
  project: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  messages: Message[];
  warnings: string[];
}

export interface Dataset {
  schemaVersion: 1;
  sourceExportId: string;
  sourceName: string;
  importedAt: string;
  conversations: Conversation[];
  warnings: string[];
}

export interface SearchOptions {
  query: string;
  scope: SearchScope;
  fields: 'text' | 'title' | 'both';
  caseSensitive: boolean;
  branching: BranchPolicy;
  selectedIds: string[] | null;
  role: Role | 'all';
  startInclusive: string | null;
  endExclusive: string | null;
}

export interface Hit {
  sourceExportId: string;
  chatId: string;
  messageId: string | null;
  role: Role | null;
  timestamp: string | null;
  field: 'title' | 'message' | 'conversation';
  offsets: { start: number; end: number }[];
  occurrences: number;
}

export interface SearchGroup {
  chatId: string;
  hits: Hit[];
}

export interface SearchResult {
  groups: SearchGroup[];
  messageCount: number;
  occurrenceCount: number;
  indexedConversations: number;
  indexedMessages: number;
  warnings: string[];
}

export type WorkerRequest =
  | { id: number; type: 'import'; file: File }
  | { id: number; type: 'restore' }
  | { id: number; type: 'clear' }
  | { id: number; type: 'search'; options: SearchOptions }
  | { id: number; type: 'statistics'; chatIds: string[]; branching: BranchPolicy }
  | {
      id: number;
      type: 'export';
      chatIds: string[];
      branching: BranchPolicy;
      format: ExportFormat;
      kind: 'conversations' | 'statistics';
      filter: SearchOptions | null;
    };

export type WorkerResponse =
  | { id: number; type: 'progress'; message: string }
  | { id: number; type: 'dataset'; dataset: Dataset | null }
  | { id: number; type: 'results'; result: SearchResult }
  | { id: number; type: 'statistics'; report: Statistics }
  | { id: number; type: 'download'; bytes: Uint8Array; filename: string }
  | { id: number; type: 'error'; message: string };

export function branchMessages(chat: Conversation, policy: BranchPolicy): Message[] {
  return policy === 'all-branches' ? chat.messages : chat.messages.filter((m) => m.active);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
