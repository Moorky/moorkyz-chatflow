import type { SearchOptions } from '../../shared/model';

export const searchDefaults: SearchOptions = {
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
