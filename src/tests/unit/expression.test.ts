import { describe, expect, it } from 'vitest';
import { expressionAssistance, insertExpression } from '../../search/expression';
import type { ExpressionAction } from '../../search/expression';
import { contains, evaluate, occurrences, parseQuery, positivePatterns } from '../../search/query';
import { SearchIndex } from '../../search';
import { normalizeExport } from '../../importer/normalize';
import { conversation } from '../fixtures/synthetic';
import { searchDefaults as options } from '../fixtures/options';

describe('caret-aware expression editing', () => {
  it.each<[string, number, number, ExpressionAction, string, number, number]>([
    ['alpha beta', 5, 5, 'AND', 'alpha AND beta', 10, 10],
    ['alpha beta', 6, 6, 'OR', 'alpha OR beta', 9, 9],
    ['alpha', 5, 5, 'NOT', 'alpha NOT ', 10, 10],
    ['alpha', 0, 0, 'NOT', 'NOT alpha', 4, 4],
    ['(beta)', 1, 1, 'NOT', '(NOT beta)', 5, 5],
    ['alpha beta', 6, 10, 'NOT', 'alpha NOT ', 10, 10],
    ['moorkyz', 4, 4, '*', 'moor*kyz', 5, 5],
    ['alpha', 0, 5, '*', '*', 1, 1],
    ['', 0, 0, 'phrase', '""', 1, 1],
    ['', 0, 0, 'group', '()', 1, 1],
    ['alpha beta gamma', 6, 10, 'phrase', 'alpha "beta" gamma', 7, 11],
    ['alpha OR beta', 0, 13, 'group', '(alpha OR beta)', 1, 14],
    ['alphabeta', 5, 5, 'group', 'alpha () beta', 7, 7],
    ['(alpha)', 6, 6, 'phrase', '(alpha "")', 8, 8],
    ['"alpha', 6, 6, '"', '"alpha"', 7, 7],
    ['(alpha', 6, 6, ')', '(alpha)', 7, 7],
  ])('edits %j at %i..%i with %s', (value, start, end, action, edited, from, through) => {
    expect(insertExpression(value, start, end, action)).toEqual({
      value: edited,
      start: from,
      end: through,
    });
  });

  it('escapes embedded quotes and backslashes when wrapping a literal phrase', () => {
    const text = 'alpha "beta" C:\\work';
    const result = insertExpression(text, 0, text.length, 'phrase');
    expect(parseQuery(result.value)).toEqual({ type: 'term', value: text });
    expect(result.value.slice(result.start, result.end)).toBe('alpha \\"beta\\" C:\\\\work');
  });
});

describe('inline validation and adaptive assistance', () => {
  it.each([
    ['"unfinished', 'Unclosed', 'closing quotation'],
    ['""', 'empty', 'between the quotes'],
    ['(alpha OR beta', 'Missing closing', 'each open group'],
    ['alpha)', 'Unexpected closing', 'extra closing'],
    ['role:user', 'Field syntax', 'quote literal colons'],
    ['alpha AND', 'Expected', 'keyword after the operator'],
    ['AND alpha', 'Expected', 'remove adjacent AND/OR'],
    ['x'.repeat(4097), 'budget', 'Shorten'],
    ['('.repeat(33) + 'x' + ')'.repeat(33), 'budget', 'Shorten'],
  ])('explains invalid input %j', (value, error, correction) => {
    const assistance = expressionAssistance(value);
    expect(assistance.error).toContain(error);
    expect(assistance.correction).toContain(correction);
  });

  it.each([
    ['', undefined, ['phrase', 'group', 'NOT']],
    ['alpha AND ', undefined, ['phrase', 'group', 'NOT']],
    ['NOT ', undefined, ['phrase', 'group', 'NOT']],
    ['(', undefined, ['phrase', 'group', 'NOT']],
    ['alpha', undefined, ['AND', 'OR', 'NOT']],
    ['BAND', undefined, ['AND', 'OR', 'NOT']],
    ['(alpha', undefined, ['AND', 'OR', 'NOT', ')']],
    ['(alpha)', undefined, ['AND', 'OR', 'NOT']],
    ['alpha)', undefined, ['AND', 'OR', 'NOT']],
    ['"alpha AND', undefined, ['"']],
    ['"a\\"b', undefined, ['"']],
    ['"C:\\\\work"', undefined, ['AND', 'OR', 'NOT']],
    ['"()"', undefined, ['AND', 'OR', 'NOT']],
    ['moorkyz', 4, ['*', 'phrase', 'group']],
    ['alpha AND beta', 6, ['AND', 'OR', 'NOT']],
    ['alpha AND beta', 10, ['phrase', 'group', 'NOT']],
  ])('suggests syntactically appropriate next input for %j at %s', (value, cursor, next) => {
    expect(expressionAssistance(value, cursor).next).toEqual(next);
  });

  it('clears the validation error after correction', () => {
    expect(expressionAssistance('alpha AND "beta"').error).toBeNull();
    expect(expressionAssistance('alpha AND "beta"').correction).toBe('');
  });
});

describe('wildcard search', () => {
  it.each([
    ['moorkyz*', 'MOORKYZ-chatflow moorkyz premoorkyz', false, ['MOORKYZ-chatflow', 'moorkyz']],
    ['*evidence*', 'preEvidence-post evidence other', false, ['preEvidence-post', 'evidence']],
    ['*flow', 'chatflow chatflowing', true, ['chatflow']],
    ['moor*yz', 'moorkyz mooryz moor yz', true, ['moorkyz', 'mooryz']],
    ['ab*bc', 'abc abbc abZZbc', true, ['abbc', 'abZZbc']],
    ['*a*b*', 'ab aab aZZb ac', true, ['ab', 'aab', 'aZZb']],
    ['a**b*', 'ab abc', true, ['ab', 'abc']],
    ['*', 'alpha\nbeta  gamma', true, ['alpha', 'beta', 'gamma']],
    ['a.b*', 'a.bcd axbcd', true, ['a.bcd']],
    ['K*', 'kelvin Kelvin', false, ['kelvin', 'Kelvin']],
    ['RED*', 'red REDWOOD', true, ['REDWOOD']],
    ['missing*', 'alpha beta', false, []],
    ['x*', '', false, []],
  ])('matches %s with exact original offsets', (term, text, caseSensitive, expected) => {
    const ranges = occurrences(text, term, caseSensitive, true);
    expect(ranges.map((range) => text.slice(range.start, range.end))).toEqual(expected);
    expect(contains(text, term, caseSensitive, true)).toBe(expected.length > 0);
  });

  it('keeps quoted asterisks literal, including their highlight patterns', () => {
    const query = parseQuery('alpha* OR "alpha*" OR alpha*');
    expect(positivePatterns(query)).toEqual([
      { value: 'alpha*', wildcard: true },
      { value: 'alpha*' },
    ]);
    expect(
      evaluate(parseQuery('"alpha*"'), (term, wildcard) =>
        contains('alphabet', term, false, wildcard),
      ),
    ).toBe(false);
    expect(contains('literal alpha*', 'alpha*', false)).toBe(true);
    expect(occurrences('literal alpha*', 'alpha*', false)).toEqual([{ start: 8, end: 14 }]);
  });

  it('does not interpret wildcard fragments as regex or cross whitespace', () => {
    expect(contains('hello world', 'hello*world', false, true)).toBe(false);
    expect(contains('xxx', '(x+)*', false, true)).toBe(false);
    expect(contains('a'.repeat(20_000), '*a'.repeat(128) + '*z', false, true)).toBe(false);
  });

  it('preserves Boolean scope, negation, Unicode offsets and exact hit counts', () => {
    const index = new SearchIndex(
      normalizeExport(
        [
          [
            conversation('split', ['🚀 moorkyz-chatflow', 'evidence']),
            conversation('same', ['moorkyz evidence', 'test']),
            conversation('title', ['unrelated'], 'moorkyz-title'),
          ],
        ],
        'hash',
        'synthetic.json',
      ),
    );
    const same = index.search({ ...options, fields: 'text', query: 'moor* AND *evidence*' });
    expect(same.groups.map((group) => group.chatId)).toEqual(['same']);
    const anywhere = index.search({
      ...options,
      fields: 'text',
      scope: 'conversation',
      query: '(moor* AND *evidence*) NOT test',
    });
    expect(anywhere.groups.map((group) => group.chatId)).toEqual(['split']);
    expect(anywhere.messageCount).toBe(2);
    expect(anywhere.occurrenceCount).toBe(2);
    expect(anywhere.groups[0]?.hits[0]?.offsets).toEqual([{ start: 3, end: 19 }]);
    expect(
      index
        .search({ ...options, fields: 'title', query: 'moorkyz*' })
        .groups.map((group) => group.chatId),
    ).toEqual(['title']);
    expect(
      index.search({ ...options, fields: 'text', query: 'NOT moor*' }).groups,
    ).not.toHaveLength(0);
  });
});
