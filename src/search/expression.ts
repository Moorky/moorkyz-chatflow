import { parseQuery } from './query';
import { errorMessage } from '../shared/model';

export type ExpressionAction = 'AND' | 'OR' | 'NOT' | '*' | 'phrase' | 'group' | '"' | ')';

export function insertExpression(
  value: string,
  start: number,
  end: number,
  action: ExpressionAction,
): { value: string; start: number; end: number } {
  const before = value.slice(0, start);
  const after = value.slice(end);
  if (action === '*' || action === '"' || action === ')') {
    const position = before.length + 1;
    return { value: before + action + after, start: position, end: position };
  }
  const leading = before && !/[\s("]$/u.test(before) ? ' ' : '';
  const trailing = after && /^\s/u.test(after) ? '' : ' ';
  if (action === 'phrase' || action === 'group') {
    const selected = value.slice(start, end);
    const content =
      action === 'phrase' ? selected.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : selected;
    const opening = action === 'phrase' ? '"' : '(';
    const closing = action === 'phrase' ? '"' : ')';
    const prefix = selected ? '' : leading;
    const suffix = !selected && after && !/^[\s)"]/u.test(after) ? ' ' : '';
    const position = before.length + prefix.length + 1;
    return {
      value: before + prefix + opening + content + closing + suffix + after,
      start: position,
      end: position + content.length,
    };
  }
  const existingSpace = after.match(/^\s*/u)![0].length;
  const position = before.length + leading.length + action.length + trailing.length + existingSpace;
  return {
    value: before + leading + action + trailing + after,
    start: position,
    end: position,
  };
}

export function expressionAssistance(value: string, cursor = value.length) {
  let error: string | null = null;
  let correction = '';
  try {
    parseQuery(value);
  } catch (problem) {
    error = errorMessage(problem);
    if (error.includes('Unclosed')) correction = 'Add a closing quotation mark (").';
    else if (error.includes('empty')) correction = 'Put a word or phrase between the quotes.';
    else if (error.includes('Missing closing'))
      correction = 'Add a closing parenthesis for each open group.';
    else if (error.includes('Unexpected closing'))
      correction = 'Remove the extra closing parenthesis or add its opening parenthesis.';
    else if (error.includes('Field syntax'))
      correction =
        'Use Search scope for titles; quote literal colons, such as "https://example.com".';
    else if (error.includes('budget')) correction = 'Shorten the expression or use fewer groups.';
    else correction = 'Add a keyword after the operator or opening group; remove adjacent AND/OR.';
  }
  const prefix = value.slice(0, Math.min(cursor, 4096));
  let quoted = false;
  let depth = 0;
  for (let index = 0; index < prefix.length; index++) {
    const char = prefix[index];
    if (quoted && char === '\\' && (prefix[index + 1] === '"' || prefix[index + 1] === '\\')) {
      index++;
    } else if (char === '"') quoted = !quoted;
    else if (!quoted && char === '(') depth++;
    else if (!quoted && char === ')') depth--;
  }
  let next: ExpressionAction[];
  let hint: string;
  if (quoted) {
    next = ['"'];
    hint = 'Finish the exact phrase with a closing quote. AND/OR inside quotes are literal text.';
  } else if (
    !prefix.trim() ||
    /(?:^|[\s(])(?:AND|OR|NOT)\s*$/u.test(prefix) ||
    /\(\s*$/u.test(prefix)
  ) {
    next = ['phrase', 'group', 'NOT'];
    hint = 'Next: enter a keyword, an exact phrase, a group, or NOT to exclude a term.';
  } else if (
    cursor > 0 &&
    /[^\s()"]/u.test(value[cursor - 1]!) &&
    /[^\s()"]/u.test(value[cursor] ?? ' ')
  ) {
    next = ['*', 'phrase', 'group'];
    hint = 'Inside a keyword: insert * for a wildcard, or select text to wrap it.';
  } else {
    next = ['AND', 'OR', 'NOT', ...(depth > 0 ? [')' as const] : [])];
    hint = 'Next: combine terms with AND/OR, exclude with NOT, or close an open group.';
  }
  return { error, correction, next, hint };
}
