import { describe, expect, it } from 'vitest';
import { normalizeExport } from '../../src/importer/normalize';
import { SearchIndex } from '../../src/search';
import { contains, occurrences } from '../../src/search/query';
import type { SearchOptions } from '../../src/shared/model';
import { validDataset } from '../../src/storage/validate';
import { conversation } from '../fixtures/synthetic';

// Counterexamples from the PR #1 code review; each failed before its fix.
const base: SearchOptions = {
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

describe('malformed parent references', () => {
  it.each([42, ['root'], { id: 'root' }, '', '   ', true])(
    'rejects a supplied non-reference parent %j instead of making a root',
    (parent) => {
      const raw = {
        id: 'bad-parent',
        current_node: 'child',
        mapping: {
          root: { parent: null, message: null },
          child: { parent, message: { id: 'm1', content: { parts: ['text'] } } },
        },
      };
      expect(() => normalizeExport([[raw]], 'hash', 'example.json')).toThrow(
        'Invalid parent reference at node child in bad-parent.',
      );
    },
  );

  it('still accepts null and omitted root parents', () => {
    const raw = {
      id: 'roots',
      current_node: 'child',
      mapping: {
        root: { message: null },
        child: { parent: 'root', message: { id: 'm1', content: { parts: ['text'] } } },
      },
    };
    expect(
      normalizeExport([[raw]], 'hash', 'example.json').conversations[0]!.messages,
    ).toHaveLength(1);
  });
});

describe('restored source links', () => {
  it('rejects a source URL whose official chat ID is missing', () => {
    const snapshot = normalizeExport([[conversation()]], 'a'.repeat(64), 'example.json');
    Object.assign(snapshot.conversations[0]!, {
      originalId: null,
      originalUrl: 'https://chatgpt.com/c/null',
    });
    expect(validDataset(snapshot)).toBe(false);
    Object.assign(snapshot.conversations[0]!, {
      originalId: '',
      originalUrl: 'https://chatgpt.com/c/',
    });
    expect(validDataset(snapshot)).toBe(false);
  });
});

describe('search counterexamples', () => {
  const index = new SearchIndex(
    normalizeExport(
      [
        [
          conversation('kept', ['clean one', 'clean two']),
          conversation('dropped', ['has draft', 'clean']),
          conversation('empty', [], 'Empty conversation'),
        ],
      ],
      'source-hash',
      'synthetic.json',
    ),
  );

  it('does not count every message as a hit for a NOT-only chat-scope query', () => {
    const result = index.search({ ...base, scope: 'conversation', query: 'NOT draft' });
    expect(result.groups.map((group) => group.chatId)).toEqual(['kept', 'empty']);
    expect(result.messageCount).toBe(0);
    expect(result.occurrenceCount).toBe(0);
    for (const group of result.groups) {
      expect(group.hits).toEqual([expect.objectContaining({ field: 'conversation' })]);
    }
  });

  it('keeps positive message witnesses for mixed chat-scope queries', () => {
    const result = index.search({ ...base, scope: 'conversation', query: 'one AND NOT draft' });
    expect(result.groups.map((group) => group.chatId)).toEqual(['kept']);
    expect(result.groups[0]!.hits.map((hit) => hit.messageId)).toEqual(['kept-m0']);
    expect(result.messageCount).toBe(1);
  });

  it('lists chats without messages in an empty Messages-only inventory', () => {
    for (const scope of ['message', 'conversation'] as const) {
      const result = index.search({ ...base, scope });
      expect(result.groups.map((group) => group.chatId)).toEqual(['kept', 'dropped', 'empty']);
      expect(result.messageCount).toBe(4);
    }
  });

  it('still excludes message-less chats when a role or date filter is active', () => {
    const result = index.search({ ...base, role: 'user' });
    expect(result.groups.map((group) => group.chatId)).toEqual(['kept', 'dropped']);
  });
});

describe('short-circuit literal matching', () => {
  it.each([
    ['A.B a.b', 'a.b', false],
    ['A.B', 'a.b', true],
    ['axb', 'a.b', false],
    ['(x) [y] $z ^w', '[y] $z', false],
    ['ÄRGER', 'ärger', false],
    ['ÄRGER', 'ärger', true],
    ['', 'a', false],
  ])('agrees with occurrence enumeration for %j / %j (case %s)', (text, term, caseSensitive) => {
    expect(contains(text, term, caseSensitive)).toBe(
      occurrences(text, term, caseSensitive).length > 0,
    );
  });
});
