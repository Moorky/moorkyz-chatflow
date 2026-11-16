import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { openExtractionStore } from '../../extraction/store';
import { newExtraction } from '../../extraction/engine';
import { serializeConversation } from '../../extraction/serialize';
import { conversation } from '../fixtures/synthetic';
import { failNextOpen, interruptWrites } from '../fixtures/idb-failures';

beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([null, new DOMException('Extractor storage denied', 'UnknownError')])(
  'surfaces asynchronous extractor open failure: %s',
  async (error) => {
    failNextOpen('error', error);
    await expect(openExtractionStore()).rejects.toThrow(
      error?.message ?? 'Cannot open extraction checkpoints',
    );
  },
);

it('explains blocked extractor upgrades', async () => {
  failNextOpen('blocked');
  await expect(openExtractionStore()).rejects.toThrow('Close other extractor tabs');
});

it.each([
  ['pending', null, 'aborted'],
  ['after-success', null, 'checkpoint transaction failed'],
  ['error-event', new DOMException('Quota exhausted', 'QuotaExceededError'), 'Quota exhausted'],
] as const)(
  'preserves checkpoints after a failed transaction: %s',
  async (mode, reportedError, message) => {
    const storage = await openExtractionStore();
    const state = newExtraction(
      {
        mode: 'all',
        target: '',
        query: '',
        fields: 'title',
        workspaceId: '',
        concurrency: 1,
        includeArchived: false,
      },
      'account',
    );
    await storage.store.save(state);
    const failure = interruptWrites(mode, reportedError);
    await expect(storage.store.save({ ...state, status: 'failed' })).rejects.toThrow(message);
    failure.mockRestore();
    expect(await storage.load()).toEqual(state);
    storage.close();
  },
);

it('persists and restores checkpoints/documents atomically and clears both stores', async () => {
  const storage = await openExtractionStore();
  expect(await storage.load()).toBeNull();
  const state = newExtraction(
    {
      mode: 'all',
      target: '',
      query: '',
      fields: 'title',
      workspaceId: '',
      concurrency: 1,
      includeArchived: false,
    },
    'account',
  );
  await storage.store.save(state);
  const raw = conversation('one');
  const saved = { raw, document: serializeConversation(raw, state.id, state.startTime) };
  await storage.store.put('one', saved);
  storage.close();
  const reopened = await openExtractionStore();
  expect(await reopened.load()).toEqual(state);
  expect(await reopened.store.get('one')).toEqual(saved);
  await reopened.clear();
  expect(await reopened.load()).toBeNull();
  expect(await reopened.store.get('one')).toBeUndefined();
  reopened.close();
});

it('surfaces storage denial and damaged checkpoint versions instead of silently resuming', async () => {
  const storage = await openExtractionStore();
  const state = newExtraction(
    {
      mode: 'all',
      target: '',
      query: '',
      fields: 'title',
      workspaceId: '',
      concurrency: 1,
      includeArchived: false,
    },
    'a',
  );
  await storage.store.save({ ...state, version: 2 } as never);
  await expect(storage.load()).rejects.toThrow('damaged');
  await storage.clear();
  storage.close();
  vi.spyOn(indexedDB, 'open').mockImplementation(() => {
    throw new Error('Storage denied');
  });
  await expect(openExtractionStore()).rejects.toThrow('Storage denied');
});
