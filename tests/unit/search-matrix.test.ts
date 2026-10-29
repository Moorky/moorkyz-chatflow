import { describe, expect, it } from 'vitest';
import { normalizeExport } from '../../src/importer/normalize';
import { SearchIndex } from '../../src/search';
import { occurrences, parseQuery, positiveTerms } from '../../src/search/query';
import { conversation } from '../fixtures/synthetic';
import { searchDefaults } from '../fixtures/options';

const documents = ['', 'red', 'blue', 'red blue'];
const combinations = documents.flatMap((first, i) =>
  documents.map((second, j) => ({
    id: `combination-${i}-${j}`,
    messages: [first, second],
  })),
);
const index = new SearchIndex(
  normalizeExport(
    [combinations.map((value) => conversation(value.id, value.messages))],
    'hash',
    'example.json',
  ),
);
const conditions = [
  { query: 'red', predicate: (red: boolean) => red },
  { query: 'NOT red', predicate: (red: boolean) => !red },
  { query: 'red AND blue', predicate: (red: boolean, blue: boolean) => red && blue },
  { query: 'red OR blue', predicate: (red: boolean, blue: boolean) => red || blue },
  { query: 'red NOT blue', predicate: (red: boolean, blue: boolean) => red && !blue },
  { query: 'red OR NOT blue', predicate: (red: boolean, blue: boolean) => red || !blue },
  { query: 'NOT (red OR blue)', predicate: (red: boolean, blue: boolean) => !(red || blue) },
  { query: 'NOT NOT red', predicate: (red: boolean) => red },
];

describe.each(['message', 'conversation'] as const)('%s Boolean truth table', (scope) => {
  it.each(conditions)(
    'matches independent expected chat sets for $query',
    ({ query, predicate }) => {
      const expected = combinations.filter(({ messages }) =>
        scope === 'message'
          ? messages.some((text) => predicate(text.includes('red'), text.includes('blue')))
          : predicate(
              messages.some((text) => text.includes('red')),
              messages.some((text) => text.includes('blue')),
            ),
      );
      const result = index.search({ ...searchDefaults, scope, query });
      expect(result.groups.map((group) => group.chatId)).toEqual(expected.map((value) => value.id));
      for (const group of result.groups) {
        const messageIds = group.hits.flatMap((hit) => (hit.messageId ? [hit.messageId] : []));
        expect(new Set(messageIds).size).toBe(messageIds.length);
      }
    },
  );
});

describe('title, role, time and literal matching boundaries', () => {
  const dataset = normalizeExport(
    [
      [
        conversation('body', ['red', 'blue'], 'Unique heading'),
        conversation('title', ['neither'], 'red blue'),
        conversation('empty', [], 'red empty'),
      ],
    ],
    'hash',
    'example.json',
  );
  const local = new SearchIndex(dataset);

  it('does not combine a title and body term in same-message scope', () => {
    expect(
      local.search({ ...searchDefaults, fields: 'both', query: 'heading red' }).groups,
    ).toHaveLength(0);
    expect(
      local
        .search({ ...searchDefaults, fields: 'both', query: 'heading red', scope: 'conversation' })
        .groups.map((group) => group.chatId),
    ).toEqual(['body']);
    expect(
      local
        .search({ ...searchDefaults, fields: 'title', query: 'red blue' })
        .groups.map((group) => group.chatId),
    ).toEqual(['title']);
  });

  it('keeps title-only hits out of matching-message counts and applies role filters first', () => {
    const titles = local.search({ ...searchDefaults, fields: 'title', query: 'red' });
    expect(titles.messageCount).toBe(0);
    expect(titles.groups).toHaveLength(2);
    expect(titles.groups[0]?.hits[0]?.field).toBe('title');
    expect(
      local.search({ ...searchDefaults, fields: 'title', query: 'red', role: 'assistant' }).groups,
    ).toHaveLength(0);
    expect(
      local.search({
        ...searchDefaults,
        query: 'red AND blue',
        scope: 'conversation',
        role: 'user',
      }).groups,
    ).toHaveLength(0);
  });

  it('treats UTC interval start as inclusive and end as exclusive, including missing timestamps', () => {
    const chat = dataset.conversations[0]!;
    const start = chat.messages[0]!.timestamp!;
    const end = chat.messages[1]!.timestamp!;
    expect(
      local.search({ ...searchDefaults, query: 'red', startInclusive: start, endExclusive: end })
        .messageCount,
    ).toBe(1);
    expect(local.search({ ...searchDefaults, query: 'blue', endExclusive: end }).messageCount).toBe(
      0,
    );
    chat.messages[0]!.timestamp = null;
    expect(
      local.search({ ...searchDefaults, query: 'red', startInclusive: start }).messageCount,
    ).toBe(0);
    expect(local.search({ ...searchDefaults, query: 'red' }).messageCount).toBe(1);
  });

  it('deduplicates offsets and preserves case-sensitive literal punctuation and escaped phrases', () => {
    expect(occurrences('a+b a.b [x] (x)', 'a+b', false)).toEqual([{ start: 0, end: 3 }]);
    expect(occurrences('RED red', 'red', true)).toEqual([{ start: 4, end: 7 }]);
    expect(positiveTerms(parseQuery('red OR red OR NOT blue'))).toEqual(['red']);
    expect(positiveTerms(parseQuery('NOT NOT red'))).toEqual(['red']);
    expect(parseQuery('"C:\\\\work"')).toEqual({ type: 'term', value: 'C:\\work' });
    const duplicate = local.search({ ...searchDefaults, query: 'red OR red' });
    expect(duplicate.occurrenceCount).toBe(1);
  });
});
