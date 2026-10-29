export function selectIds(
  current: ReadonlySet<string>,
  orderedIds: string[],
  mode: 'all' | 'first' | 'last',
  count?: number,
): Set<string> {
  if (mode !== 'all' && (!Number.isSafeInteger(count) || count === undefined || count < 1)) {
    throw new Error('Selection count must be a positive whole number.');
  }
  const ids = [...new Set(orderedIds)];
  const chosen = mode === 'all' ? ids : mode === 'first' ? ids.slice(0, count) : ids.slice(-count!);
  return new Set([...current, ...chosen]);
}
