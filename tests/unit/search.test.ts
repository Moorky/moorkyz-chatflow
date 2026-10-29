import { describe, expect, it } from 'vitest';
import { normalizeExport } from '../../src/importer/normalize';
import { SearchIndex } from '../../src/search';
import type { SearchOptions } from '../../src/shared/model';
import { evaluate, occurrences, parseQuery } from '../../src/search/query';
import { branchConversation, conversation } from '../fixtures/synthetic';

const options: SearchOptions = {
  query: '',
  scope: 'message',
  fields: 'text',
  caseSensitive: false,
  branching: 'active-path',
  selectedIds: null,
  role: 'all',
  startInclusive: null,
  endExclusive: null,
};
const index = new SearchIndex(
  normalizeExport(
    [
      [
        conversation('split', ['alpha alpha', 'beta', 'excluded']),
        conversation('same', ['alpha beta', 'clean']),
        conversation('other', ['gamma', 'ALPHA']),
        branchConversation(),
      ],
    ],
    'source-hash',
    'synthetic.json',
  ),
);

describe('Boolean syntax', () => {
  it('implements NOT > AND > OR, implicit AND, phrases and parentheses', () => {
    const contains = (query: string, text: string) =>
      evaluate(parseQuery(query), (term) => text.includes(term));
    expect(contains('alpha OR beta AND NOT excluded', 'alpha excluded')).toBe(true);
    expect(contains('(alpha OR beta) NOT excluded', 'alpha excluded')).toBe(false);
    expect(contains('"hello world" AND beta', 'hello world beta')).toBe(true);
    expect(contains('"AND"', 'AND')).toBe(true);
    expect(contains('"a\\"b"', 'a"b')).toBe(true);
  });

  it.each([
    'alpha AND',
    'OR beta',
    '(',
    'alpha)',
    '"unclosed',
    '""',
    'role:user',
    'alpha OR OR beta',
  ])('rejects invalid syntax: %s', (query) => {
    expect(() => parseQuery(query)).toThrow();
  });

  it('bounds parser depth and size explicitly', () => {
    expect(() => parseQuery('('.repeat(40) + 'x' + ')'.repeat(40))).toThrow('nesting');
    expect(() => parseQuery('x '.repeat(300))).toThrow('token');
    expect(() => parseQuery('x'.repeat(4097))).toThrow('character');
  });
});

describe('message and conversation scope', () => {
  it('requires AND in the same message only in message scope', () => {
    const same = index.search({ ...options, query: 'alpha AND beta' });
    const anywhere = index.search({ ...options, query: 'alpha AND beta', scope: 'conversation' });
    expect(same.groups.map((g) => g.chatId)).toEqual(['same']);
    expect(anywhere.groups.map((g) => g.chatId)).toEqual(['split', 'same']);
  });

  it('applies NOT at the requested level, including pure-negative queries', () => {
    const same = index.search({ ...options, query: 'alpha NOT excluded' });
    const anywhere = index.search({
      ...options,
      query: 'alpha NOT excluded',
      scope: 'conversation',
    });
    expect(same.groups.map((g) => g.chatId)).toEqual(['split', 'same', 'other']);
    expect(anywhere.groups.map((g) => g.chatId)).toEqual(['same', 'other']);
    const negative = index.search({ ...options, query: 'NOT alpha' });
    expect(negative.groups.find((g) => g.chatId === 'other')?.hits.map((h) => h.messageId)).toEqual(
      ['other-m0'],
    );
  });

  it('never forms a phrase across separate messages', () => {
    expect(
      index
        .search({ ...options, query: '"alpha beta"', scope: 'conversation' })
        .groups.map((g) => g.chatId),
    ).toEqual(['same']);
  });

  it('returns exact message provenance, distinct messages and occurrence counts', () => {
    const result = index.search({ ...options, query: 'alpha', selectedIds: ['split'] });
    expect(result.messageCount).toBe(1);
    expect(result.occurrenceCount).toBe(2);
    expect(result.groups[0]?.hits[0]).toMatchObject({
      sourceExportId: 'source-hash',
      chatId: 'split',
      messageId: 'split-m0',
      offsets: [
        { start: 0, end: 5 },
        { start: 6, end: 11 },
      ],
    });
  });

  it('respects selected scope, roles, dates, case and branch choice', () => {
    expect(index.search({ ...options, selectedIds: [] }).groups).toHaveLength(0);
    expect(index.search({ ...options, query: 'alpha', caseSensitive: true }).messageCount).toBe(2);
    expect(index.search({ ...options, query: 'alpha', role: 'assistant' }).messageCount).toBe(1);
    expect(index.search({ ...options, query: 'discarded' }).messageCount).toBe(0);
    expect(
      index.search({ ...options, query: 'discarded', branching: 'all-branches' }).messageCount,
    ).toBe(1);
    const start = new Date(1_700_000_000 * 1000).toISOString();
    const end = new Date(1_700_000_001 * 1000).toISOString();
    expect(
      index.search({ ...options, query: 'alpha', startInclusive: start, endExclusive: end })
        .messageCount,
    ).toBe(2);
    expect(() => index.search({ ...options, startInclusive: end, endExclusive: start })).toThrow(
      'end date',
    );
    expect(() => index.search({ ...options, startInclusive: 'not-a-date' })).toThrow('UTC ISO');
  });

  it('preserves Unicode source offsets and treats regex metacharacters literally', () => {
    const text = '\u{1f680} \u4e2d\u6587 a.b [x] Stra\u00dfe';
    const matches = occurrences(text, 'a.b', false);
    expect(text.slice(matches[0]!.start, matches[0]!.end)).toBe('a.b');
    expect(occurrences(text, '[x]', true)).toHaveLength(1);
    expect(occurrences('axb', 'a.b', false)).toHaveLength(0);
  });

  it('searches and counts 25,000 message hits without truncation', () => {
    const large = new SearchIndex(
      normalizeExport(
        [
          [
            conversation(
              'large',
              Array.from({ length: 25000 }, (_, i) => `needle ${i}`),
            ),
          ],
        ],
        'hash',
        'synthetic.json',
      ),
    );
    const result = large.search({ ...options, query: 'needle' });
    expect(result.messageCount).toBe(25000);
    expect(result.groups[0]?.hits.at(-1)?.messageId).toBe('large-m24999');
  });
});
