import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkerRequest, WorkerResponse } from '../../src/shared/model';
import { normalizeExport } from '../../src/importer/normalize';
import { clearDataset, loadDataset, saveDataset } from '../../src/storage/database';
import { conversation } from '../fixtures/synthetic';
import { searchDefaults } from '../fixtures/options';

vi.mock('../../src/storage/database', () => ({
  clearDataset: vi.fn(),
  loadDataset: vi.fn(),
  saveDataset: vi.fn(),
}));

let listener: (event: MessageEvent<WorkerRequest>) => void;
let responses: WorkerResponse[];
let nextId: number;

beforeEach(async () => {
  vi.resetModules();
  vi.mocked(clearDataset).mockReset();
  vi.mocked(loadDataset).mockReset().mockResolvedValue(null);
  vi.mocked(saveDataset).mockReset().mockResolvedValue(undefined);
  responses = [];
  nextId = 0;
  vi.stubGlobal('self', {
    addEventListener: (_name: string, handler: typeof listener) => {
      listener = handler;
    },
    postMessage: (response: WorkerResponse) => responses.push(response),
  });
  await import('../../src/background/worker');
});
afterEach(() => vi.unstubAllGlobals());

type Payload = WorkerRequest extends infer R
  ? R extends WorkerRequest
    ? Omit<R, 'id'>
    : never
  : never;
async function send(payload: Payload): Promise<WorkerResponse> {
  const id = ++nextId;
  listener(new MessageEvent('message', { data: { ...payload, id } }));
  await vi.waitFor(() =>
    expect(responses.some((response) => response.id === id && response.type !== 'progress')).toBe(
      true,
    ),
  );
  return responses.find((response) => response.id === id && response.type !== 'progress')!;
}
const file = (id = 'example') => new File([JSON.stringify([conversation(id)])], 'example.json');

describe('worker request lifecycle', () => {
  it('imports, reports progress, searches, computes statistics, exports and clears', async () => {
    expect(await send({ type: 'restore' })).toMatchObject({ type: 'dataset', dataset: null });
    expect(await send({ type: 'import', file: file() })).toMatchObject({ type: 'dataset' });
    expect(responses.some((response) => response.type === 'progress')).toBe(true);
    expect(saveDataset).toHaveBeenCalledOnce();
    expect(
      await send({ type: 'search', options: { ...searchDefaults, query: 'alpha' } }),
    ).toMatchObject({ type: 'results', result: { messageCount: 1 } });
    expect(
      await send({ type: 'statistics', chatIds: ['example'], branching: 'active-path' }),
    ).toMatchObject({ type: 'statistics', report: { chats: 1, messages: 2 } });
    expect(
      await send({
        type: 'export',
        chatIds: ['example'],
        branching: 'active-path',
        format: 'json',
        kind: 'conversations',
        filter: null,
      }),
    ).toMatchObject({ type: 'download', filename: 'chatflow-conversations-json.zip' });
    expect(await send({ type: 'clear' })).toMatchObject({ type: 'dataset', dataset: null });
    expect(clearDataset).toHaveBeenCalledOnce();
    expect(await send({ type: 'search', options: searchDefaults })).toMatchObject({
      type: 'error',
    });
  });

  it.each(['search', 'statistics', 'export'] as const)(
    'rejects %s without an import',
    async (type) => {
      const payload =
        type === 'search'
          ? { type, options: searchDefaults }
          : type === 'statistics'
            ? { type, chatIds: [], branching: 'active-path' as const }
            : {
                type,
                chatIds: [],
                branching: 'active-path' as const,
                format: 'json' as const,
                kind: 'conversations' as const,
                filter: null,
              };
      expect(await send(payload)).toMatchObject({
        type: 'error',
        message: expect.stringContaining('Import a local export'),
      });
    },
  );

  it('does not replace the searchable snapshot after malformed import or failed persistence', async () => {
    await send({ type: 'import', file: file('previous') });
    expect(await send({ type: 'import', file: new File(['broken'], 'bad.json') })).toMatchObject({
      type: 'error',
    });
    vi.mocked(saveDataset).mockRejectedValueOnce(new Error('Quota exhausted'));
    expect(await send({ type: 'import', file: file('replacement') })).toMatchObject({
      type: 'error',
      message: 'Quota exhausted',
    });
    const response = await send({ type: 'search', options: searchDefaults });
    if (response.type !== 'results') throw new Error('Expected preserved index results.');
    expect(response.result.groups.map((group) => group.chatId)).toEqual(['previous']);
  });

  it('restores a persisted snapshot and recovers after a query error', async () => {
    vi.mocked(loadDataset).mockResolvedValue(
      normalizeExport([[conversation('restored')]], 'a'.repeat(64), 'example.json'),
    );
    expect(await send({ type: 'restore' })).toMatchObject({ type: 'dataset' });
    expect(
      await send({ type: 'search', options: { ...searchDefaults, query: '(' } }),
    ).toMatchObject({ type: 'error' });
    expect(await send({ type: 'search', options: searchDefaults })).toMatchObject({
      type: 'results',
      result: { indexedConversations: 1 },
    });
  });

  it('keeps the index when clearing persistent storage fails', async () => {
    await send({ type: 'import', file: file() });
    vi.mocked(clearDataset).mockRejectedValueOnce(new Error('Storage unavailable'));
    expect(await send({ type: 'clear' })).toMatchObject({
      type: 'error',
      message: 'Storage unavailable',
    });
    expect(await send({ type: 'search', options: searchDefaults })).toMatchObject({
      type: 'results',
    });
  });

  it.each([{ chatIds: [] }, { chatIds: ['unknown-chat'] }])(
    'rejects invalid statistics selection $chatIds',
    async ({ chatIds }) => {
      await send({ type: 'import', file: file() });
      expect(await send({ type: 'statistics', chatIds, branching: 'active-path' })).toMatchObject({
        type: 'error',
      });
    },
  );

  it('serializes import and search requests rather than racing the database commit', async () => {
    const importId = ++nextId;
    listener(new MessageEvent('message', { data: { id: importId, type: 'import', file: file() } }));
    const response = await send({ type: 'search', options: searchDefaults });
    expect(response.type).toBe('results');
    expect(
      responses.findIndex((value) => value.id === importId && value.type === 'dataset'),
    ).toBeLessThan(responses.indexOf(response));
  });

  it('rejects oversized file metadata before allocating or reading its contents', async () => {
    const oversized = file();
    Object.defineProperty(oversized, 'size', { value: 128 * 1024 * 1024 + 1 });
    const read = vi.spyOn(oversized, 'arrayBuffer');
    expect(await send({ type: 'import', file: oversized })).toMatchObject({
      type: 'error',
      message: expect.stringContaining('128 MiB'),
    });
    expect(read).not.toHaveBeenCalled();
  });
});
