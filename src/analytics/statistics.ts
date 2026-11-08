import { branchMessages } from '../shared/model';
import type { BranchPolicy, Conversation } from '../shared/model';

const segmenter = new Intl.Segmenter('und', { granularity: 'word' });

export function wordCount(text: string): number {
  let count = 0;
  for (const segment of segmenter.segment(text)) if (segment.isWordLike) count++;
  return count;
}

export function statistics(chats: Conversation[], branching: BranchPolicy) {
  const sources = chats.map((chat) => {
    const messages = branchMessages(chat, branching);
    const words = messages.reduce((sum, message) => sum + wordCount(message.text), 0);
    const characters = messages.reduce((sum, message) => sum + [...message.text].length, 0);
    const times = messages
      .flatMap((message) => (message.timestamp ? [message.timestamp] : []))
      .sort();
    return {
      id: chat.id,
      title: chat.title,
      url: chat.originalUrl,
      project: chat.project,
      messages: messages.length,
      words,
      characters,
      meanWords: messages.length ? words / messages.length : null,
      firstMessageAt: times[0] ?? null,
      lastMessageAt: times.at(-1) ?? null,
      missingTimestamps: messages.filter((message) => !message.timestamp).length,
      roles: {
        user: messages.filter((m) => m.role === 'user').length,
        assistant: messages.filter((m) => m.role === 'assistant').length,
        system: messages.filter((m) => m.role === 'system').length,
        tool: messages.filter((m) => m.role === 'tool').length,
        unknown: messages.filter((m) => m.role === 'unknown').length,
      },
      warnings: chat.warnings,
    };
  });
  const messages = sources.reduce((sum, source) => sum + source.messages, 0);
  const words = sources.reduce((sum, source) => sum + source.words, 0);
  const nonempty = sources.filter((source) => source.meanWords !== null);
  return {
    algorithm: 'intl-segmenter-word-v1 / unicode-codepoints-v1',
    branching,
    chats: sources.length,
    messages,
    words,
    weightedMeanWords: messages ? words / messages : null,
    meanOfChatMeans: nonempty.length
      ? nonempty.reduce((sum, source) => sum + source.meanWords!, 0) / nonempty.length
      : null,
    sources,
  };
}

export type Statistics = ReturnType<typeof statistics>;
