export type Query =
  | { type: 'term'; value: string }
  | { type: 'not'; child: Query }
  | { type: 'and' | 'or'; left: Query; right: Query };

type Token = { type: 'term'; value: string } | { type: 'and' | 'or' | 'not' | '(' | ')' };

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
          : { type: 'term', value },
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

export function evaluate(query: Query | null, matches: (term: string) => boolean): boolean {
  if (!query) return true;
  switch (query.type) {
    case 'term':
      return matches(query.value);
    case 'not':
      return !evaluate(query.child, matches);
    case 'and':
      return evaluate(query.left, matches) && evaluate(query.right, matches);
    case 'or':
      return evaluate(query.left, matches) || evaluate(query.right, matches);
  }
}

export function positiveTerms(query: Query | null, negated = false): string[] {
  if (!query) return [];
  if (query.type === 'term') return negated ? [] : [query.value];
  if (query.type === 'not') return positiveTerms(query.child, !negated);
  return [
    ...new Set([...positiveTerms(query.left, negated), ...positiveTerms(query.right, negated)]),
  ];
}

export function occurrences(text: string, term: string, caseSensitive: boolean) {
  const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...text.matchAll(new RegExp(pattern, caseSensitive ? 'gu' : 'giu'))].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
}
