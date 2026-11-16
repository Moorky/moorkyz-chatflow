import type { ExtractionDocument, ExtractionState, ExtractionStore } from './engine';
import { validateExtractionOptions } from './engine';

export async function openExtractionStore() {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('moorkyz-chatflow-extractor-prototype', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('state');
      request.result.createObjectStore('documents');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Cannot open extraction checkpoints.'));
    request.onblocked = () =>
      reject(new Error('Close other extractor tabs before opening checkpoints.'));
  });
  async function transaction<T>(
    stores: string[],
    mode: IDBTransactionMode,
    action: (transaction: IDBTransaction) => IDBRequest<T>,
  ) {
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      const request = action(tx);
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () =>
        reject(
          tx.error ??
            request.error ??
            new Error('Extraction checkpoint transaction failed. Free local storage and retry.'),
        );
    });
  }
  const store: ExtractionStore = {
    async save(state) {
      await transaction(['state'], 'readwrite', (tx) =>
        tx.objectStore('state').put(state, 'current'),
      );
    },
    async put(id, document) {
      await transaction(['documents'], 'readwrite', (tx) =>
        tx.objectStore('documents').put(document, id),
      );
    },
    async get(id) {
      return transaction<ExtractionDocument | undefined>(['documents'], 'readonly', (tx) =>
        tx.objectStore('documents').get(id),
      );
    },
  };
  return {
    store,
    async load(): Promise<ExtractionState | null> {
      const state = await transaction<ExtractionState | undefined>(['state'], 'readonly', (tx) =>
        tx.objectStore('state').get('current'),
      );
      if (state === undefined) return null;
      if (
        !state ||
        state.version !== 1 ||
        typeof state.id !== 'string' ||
        typeof state.accountKey !== 'string' ||
        !Array.isArray(state.inventory) ||
        !state.entries ||
        typeof state.entries !== 'object'
      ) {
        throw new Error(
          'Unsupported or damaged extractor checkpoint. Clear checkpoints before starting a new operation.',
        );
      }
      validateExtractionOptions(state.options);
      return state;
    },
    async clear() {
      await transaction(['state', 'documents'], 'readwrite', (tx) => {
        tx.objectStore('documents').clear();
        return tx.objectStore('state').clear();
      });
    },
    close() {
      db.close();
    },
  };
}
