import { describe, expect, it } from 'vitest';
import { statistics, wordCount } from '../../src/analytics/statistics';
import { normalizeExport } from '../../src/importer/normalize';
import { branchConversation, conversation } from '../fixtures/synthetic';

describe('statistics definitions', () => {
  it('does not invent denominators or dates for an empty selection or empty chat', () => {
    expect(statistics([], 'active-path')).toMatchObject({
      chats: 0,
      messages: 0,
      words: 0,
      weightedMeanWords: null,
      meanOfChatMeans: null,
      sources: [],
    });
    const dataset = normalizeExport([[conversation('empty', [])]], 'hash', 'example.json');
    expect(statistics(dataset.conversations, 'active-path').sources[0]).toMatchObject({
      messages: 0,
      characters: 0,
      meanWords: null,
      firstMessageAt: null,
      lastMessageAt: null,
    });
    expect(wordCount(' \n\t \u{1f680} !!!')).toBe(0);
  });

  it('counts roles, missing dates and codepoints rather than UTF-16 code units', () => {
    const chat = normalizeExport(
      [[conversation('roles', ['a', 'b', 'c', 'd', 'e'])]],
      'hash',
      'example.json',
    ).conversations[0]!;
    const roles = ['user', 'assistant', 'system', 'tool', 'unknown'] as const;
    for (const [i, message] of chat.messages.entries()) {
      message.role = roles[i]!;
      message.text = i === 0 ? '\u{1f680}' : 'x';
      message.timestamp =
        i === 1 ? null : new Date(Date.UTC(2026, 9, 29, 0, 0, 5 - i)).toISOString();
    }
    const source = statistics([chat], 'active-path').sources[0]!;
    expect(source.roles).toEqual({ user: 1, assistant: 1, system: 1, tool: 1, unknown: 1 });
    expect(source.characters).toBe(5);
    expect(source.missingTimestamps).toBe(1);
    expect(source.firstMessageAt).toBe('2026-10-29T00:00:01.000Z');
    expect(source.lastMessageAt).toBe('2026-10-29T00:00:05.000Z');
  });

  it('counts shared ancestors once and excludes alternate branches only under active-path policy', () => {
    const dataset = normalizeExport([[branchConversation()]], 'hash', 'example.json');
    expect(statistics(dataset.conversations, 'active-path').messages).toBe(2);
    expect(statistics(dataset.conversations, 'all-branches').messages).toBe(3);
    expect(statistics(dataset.conversations, 'all-branches').sources[0]?.missingTimestamps).toBe(3);
  });
});
