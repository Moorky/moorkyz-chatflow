import { branchMessages } from '../shared/model';
import type { Dataset, Hit, Message, SearchOptions, SearchResult } from '../shared/model';
import { evaluate, occurrences, parseQuery, positiveTerms } from './query';

function inRange(message: Message, options: SearchOptions): boolean {
  if (options.role !== 'all' && message.role !== options.role) return false;
  if (!options.startInclusive && !options.endExclusive) return true;
  if (!message.timestamp) return false;
  return (
    (!options.startInclusive || message.timestamp >= options.startInclusive) &&
    (!options.endExclusive || message.timestamp < options.endExclusive)
  );
}

export class SearchIndex {
  // Metadata and message bodies remain separate; no phrase can span messages.
  readonly conversationIndex;
  readonly messageIndex;

  constructor(readonly dataset: Dataset) {
    this.conversationIndex = new Map(dataset.conversations.map((chat) => [chat.id, chat]));
    this.messageIndex = new Map(
      dataset.conversations.map((chat) => [
        chat.id,
        new Map(chat.messages.map((message) => [message.id, message])),
      ]),
    );
  }

  search(options: SearchOptions): SearchResult {
    for (const boundary of [options.startInclusive, options.endExclusive]) {
      if (
        boundary &&
        (!Number.isFinite(Date.parse(boundary)) || new Date(boundary).toISOString() !== boundary)
      ) {
        throw new Error('Date boundaries must be valid UTC ISO timestamps.');
      }
    }
    if (
      options.startInclusive &&
      options.endExclusive &&
      options.startInclusive >= options.endExclusive
    ) {
      throw new Error('The end date must be after the start date.');
    }
    const query = parseQuery(options.query);
    const terms = positiveTerms(query);
    const selected = options.selectedIds === null ? null : new Set(options.selectedIds);
    const result: SearchResult = {
      groups: [],
      messageCount: 0,
      occurrenceCount: 0,
      indexedConversations: this.conversationIndex.size,
      indexedMessages: this.dataset.conversations.reduce(
        (sum, chat) => sum + branchMessages(chat, options.branching).length,
        0,
      ),
      warnings: [...this.dataset.warnings],
    };
    for (const chat of this.conversationIndex.values()) {
      if (selected && !selected.has(chat.id)) continue;
      const messages = branchMessages(chat, options.branching).filter((m) => inRange(m, options));
      const candidates: { text: string; message: Message | null }[] = [];
      if (options.fields !== 'text') candidates.push({ text: chat.title, message: null });
      if (options.fields !== 'title') {
        for (const message of messages) candidates.push({ text: message.text, message });
      }
      const metadataOnly = options.fields === 'title';
      if (
        (options.role !== 'all' || options.startInclusive || options.endExclusive) &&
        !messages.length
      ) {
        continue;
      }
      const match = (text: string, term: string) =>
        occurrences(text, term, options.caseSensitive).length > 0;
      if (
        options.scope === 'conversation' &&
        !evaluate(query, (term) => candidates.some((candidate) => match(candidate.text, term)))
      ) {
        continue;
      }
      const hits: Hit[] = [];
      for (const candidate of candidates) {
        const qualifies =
          options.scope === 'conversation' ||
          evaluate(query, (term) => match(candidate.text, term));
        if (!qualifies) continue;
        const ranges = terms.flatMap((term) =>
          occurrences(candidate.text, term, options.caseSensitive),
        );
        const offsets = [
          ...new Map(ranges.map((range) => [`${range.start}:${range.end}`, range])).values(),
        ].sort((a, b) => a.start - b.start || a.end - b.end);
        if (query && !offsets.length && terms.length && options.scope === 'conversation') continue;
        hits.push({
          sourceExportId: this.dataset.sourceExportId,
          chatId: chat.id,
          messageId: candidate.message?.id ?? null,
          role: candidate.message?.role ?? null,
          timestamp: candidate.message?.timestamp ?? null,
          field: candidate.message ? 'message' : 'title',
          offsets,
          occurrences: offsets.length,
        });
      }
      const qualifiesWithoutEvidence =
        options.scope === 'conversation' ||
        candidates.some((candidate) => evaluate(query, (term) => match(candidate.text, term)));
      if (!hits.length && qualifiesWithoutEvidence && (query || metadataOnly || !messages.length)) {
        hits.push({
          sourceExportId: this.dataset.sourceExportId,
          chatId: chat.id,
          messageId: null,
          role: null,
          timestamp: null,
          field: 'conversation',
          offsets: [],
          occurrences: 0,
        });
      }
      if (hits.length) {
        result.groups.push({ chatId: chat.id, hits });
        result.messageCount += hits.filter((hit) => hit.messageId !== null).length;
        result.occurrenceCount += hits.reduce((sum, hit) => sum + hit.occurrences, 0);
      }
    }
    return result;
  }
}
