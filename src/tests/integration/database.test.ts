import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { normalizeExport } from '../../importer/normalize';
import { clearDataset, loadDataset, saveDataset } from '../../storage/database';
import { conversation } from '../fixtures/synthetic';
import { failNextOpen, interruptWrites } from '../fixtures/idb-failures';

beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const snapshot = () => normalizeExport([[conversation()]], 'a'.repeat(64), 'example.json');

describe('IndexedDB snapshot transactions', () => {
  it.each([null, new DOMException('Backend refused open', 'UnknownError')])(
    'reports asynchronous open errors: %s',
    async (error) => {
      failNextOpen('error', error);
      await expect(loadDataset()).rejects.toThrow(error?.message ?? 'Cannot open local storage');
    },
  );

  it('reports an upgrade blocked by another tab', async () => {
    failNextOpen('blocked');
    await expect(loadDataset()).rejects.toThrow('blocked by another ChatFlow tab');
  });

  it.each(['after-success', 'error-event'] as const)(
    'rolls back a completed request when the transaction fails: %s',
    async (mode) => {
      const previous = snapshot();
      await saveDataset(previous);
      const failure = interruptWrites(mode);
      await expect(saveDataset({ ...previous, sourceName: 'must-not-save' })).rejects.toThrow(
        mode === 'after-success' ? 'transaction aborted' : 'transaction failed',
      );
      failure.mockRestore();
      expect(await loadDataset()).toEqual(previous);
    },
  );
  it('creates, saves, restores and replaces exactly one snapshot, then clears idempotently', async () => {
    expect(await loadDataset()).toBeNull();
    const first = snapshot();
    await saveDataset(first);
    expect(await loadDataset()).toEqual(first);
    const second = { ...first, sourceName: 'replacement.json', conversations: [] };
    await saveDataset(second);
    expect(await loadDataset()).toEqual(second);
    await clearDataset();
    await clearDataset();
    expect(await loadDataset()).toBeNull();
  });

  it('rejects damaged stored records rather than treating them as an empty successful import', async () => {
    await saveDataset(snapshot());
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('moorkyz-chatflow', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('snapshots', 'readwrite');
      transaction
        .objectStore('snapshots')
        .put({ schemaVersion: 1, conversations: [null] }, 'current');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    await expect(loadDataset()).rejects.toThrow('damaged local snapshot');
    await clearDataset();
    expect(await loadDataset()).toBeNull();
  });

  it('surfaces database open errors', async () => {
    const error = new DOMException('Storage denied', 'SecurityError');
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw error;
    });
    await expect(saveDataset(snapshot())).rejects.toThrow('Storage denied');
    await expect(loadDataset()).rejects.toThrow('Storage denied');
  });

  it('keeps the previous snapshot when a write transaction aborts and allows recovery', async () => {
    const previous = snapshot();
    await saveDataset(previous);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('moorkyz-chatflow', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const prototype = Object.getPrototypeOf(database) as IDBDatabase;
    const transaction = prototype.transaction;
    const spy = vi.spyOn(prototype, 'transaction').mockImplementation(function (
      this: IDBDatabase,
      ...args: Parameters<IDBDatabase['transaction']>
    ) {
      const tx = transaction.apply(this, args);
      if (args[1] === 'readwrite') queueMicrotask(() => tx.abort());
      return tx;
    });
    try {
      await expect(
        saveDataset({ ...previous, sourceName: 'must-not-commit.json' }),
      ).rejects.toThrow('aborted');
    } finally {
      spy.mockRestore();
      database.close();
    }
    expect(await loadDataset()).toEqual(previous);
  });
});
