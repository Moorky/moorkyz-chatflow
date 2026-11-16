export type Query =
  | { type: 'term'; value: string; wildcard?: true }
  | { type: 'not'; child: Query }
  | { type: 'and' | 'or'; left: Query; right: Query };

type Token =
  { type: 'term'; value: string; wildcard?: true } | { type: 'and' | 'or' | 'not' | '(' | ')' };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i]!;
    if (/\s/u.test(char)) {
      i++;
      continue;
    }
    if (char === '(' || char === ')') {
      tokens.push({ type: char });
      i++;
    } else if (char === '"') {
      i++;
      let value = '';
      let closed = false;
      while (i < source.length) {
        const next = source[i++]!;
        if (next === '"') {
          closed = true;
          break;
        }
        if (next === '\\' && (source[i] === '"' || source[i] === '\\')) {
          value += source[i++]!;
        } else value += next;
      }
      if (!closed) throw new Error('Unclosed quoted phrase.');
      if (!value.trim()) throw new Error('Quoted phrases cannot be empty.');
      tokens.push({ type: 'term', value });
    } else {
      const start = i;
      while (i < source.length && !/[\s()"]/u.test(source[i]!)) i++;
      const value = source.slice(start, i);
      if (value.includes(':')) {
        throw new Error(
          'Field syntax is not supported yet. Quote literal text containing a colon.',
        );
      }
      tokens.push(
        value === 'AND' || value === 'OR' || value === 'NOT'
          ? { type: value.toLowerCase() as 'and' | 'or' | 'not' }
          : { type: 'term', value, ...(value.includes('*') ? { wildcard: true as const } : {}) },
      );
    }
    if (tokens.length > 256) throw new Error('Query exceeds the 256-token safety budget.');
  }
  return tokens;
}

export function parseQuery(source: string): Query | null {
  if (source.length > 4096) throw new Error('Query exceeds the 4,096-character safety budget.');
  const tokens = tokenize(source);
  if (!tokens.length) return null;
  let index = 0;
  let depth = 0;
  function unary(): Query {
    if (++depth > 32) throw new Error('Query nesting exceeds the 32-level safety budget.');
    const token = tokens[index++];
    let result: Query;
    if (token?.type === 'not') result = { type: 'not', child: unary() };
    else if (token?.type === '(') {
      result = or();
      if (tokens[index++]?.type !== ')') throw new Error('Missing closing parenthesis.');
    } else if (token?.type === 'term') result = token;
    else throw new Error('Expected a word, quoted phrase, NOT, or opening parenthesis.');
    depth--;
    return result;
  }
  function and(): Query {
    let left = unary();
    while (index < tokens.length) {
      const type = tokens[index]?.type;
      if (type === 'or' || type === ')') break;
      if (type === 'and') index++;
      left = { type: 'and', left, right: unary() };
    }
    return left;
  }
  function or(): Query {
    let left = and();
    while (tokens[index]?.type === 'or') {
      index++;
      left = { type: 'or', left, right: and() };
    }
    return left;
  }
  const result = or();
  if (index !== tokens.length) throw new Error('Unexpected closing parenthesis.');
  return result;
}

export function evaluate(
  query: Query | null,
  matches: (term: string, wildcard?: boolean) => boolean,
): boolean {
  if (!query) return true;
  switch (query.type) {
    case 'term':
      return matches(query.value, query.wildcard);
    case 'not':
      return !evaluate(query.child, matches);
    case 'and':
      return evaluate(query.left, matches) && evaluate(query.right, matches);
    case 'or':
      return evaluate(query.left, matches) || evaluate(query.right, matches);
  }
}

export function positivePatterns(
  query: Query | null,
  negated = false,
): { value: string; wildcard?: true }[] {
  if (!query) return [];
  if (query.type === 'term')
    return negated ? [] : [{ value: query.value, ...(query.wildcard ? { wildcard: true } : {}) }];
  if (query.type === 'not') return positivePatterns(query.child, !negated);
  return [
    ...new Map(
      [...positivePatterns(query.left, negated), ...positivePatterns(query.right, negated)].map(
        (pattern) => [`${Boolean(pattern.wildcard)}:${pattern.value}`, pattern],
      ),
    ).values(),
  ];
}

export function positiveTerms(query: Query | null, negated = false): string[] {
  return [...new Set(positivePatterns(query, negated).map((pattern) => pattern.value))];
}

function literalPattern(term: string, caseSensitive: boolean, global: boolean): RegExp {
  const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(pattern, `${global ? 'g' : ''}${caseSensitive ? 'u' : 'iu'}`);
}

function* wildcardOccurrences(text: string, term: string, caseSensitive: boolean) {
  const parts = term.split('*').filter(Boolean);
  const patterns = parts.map((part, index) => {
    const literal = literalPattern(part, caseSensitive, false);
    return new RegExp(
      `${index === 0 && !term.startsWith('*') ? '^' : ''}${literal.source}${index === parts.length - 1 && !term.endsWith('*') ? '$' : ''}`,
      literal.flags,
    );
  });
  for (const word of text.matchAll(/\S+/gu)) {
    let cursor = 0;
    const matches = patterns.every((pattern) => {
      const match = pattern.exec(word[0].slice(cursor));
      if (!match) return false;
      cursor += match.index + match[0].length;
      return true;
    });
    if (matches) yield { start: word.index, end: word.index + word[0].length };
  }
}

export function occurrences(text: string, term: string, caseSensitive: boolean, wildcard = false) {
  if (wildcard) return [...wildcardOccurrences(text, term, caseSensitive)];
  return [...text.matchAll(literalPattern(term, caseSensitive, true))].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
}

export function contains(
  text: string,
  term: string,
  caseSensitive: boolean,
  wildcard = false,
): boolean {
  if (wildcard) return !wildcardOccurrences(text, term, caseSensitive).next().done;
  return literalPattern(term, caseSensitive, false).test(text);
}
