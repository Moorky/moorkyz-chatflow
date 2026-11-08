import type { Dataset } from '../shared/model';
import { validDataset } from './validate';

const DATABASE = 'moorkyz-chatflow';
const STORE = 'snapshots';

async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(request.error ?? new Error('Cannot open local storage.'));
    request.onblocked = () =>
      reject(new Error('Local database upgrade blocked by another ChatFlow tab.'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () =>
        reject(tx.error ?? request.error ?? new Error('Local storage transaction aborted.'));
      tx.onerror = () =>
        reject(tx.error ?? request.error ?? new Error('Local storage transaction failed.'));
    });
  } finally {
    db.close();
  }
}

export async function saveDataset(dataset: Dataset): Promise<void> {
  await transaction('readwrite', (store) => store.put(dataset, 'current'));
}

export async function loadDataset(): Promise<Dataset | null> {
  const value: unknown = await transaction('readonly', (store) => store.get('current'));
  if (value === undefined) return null;
  if (!validDataset(value)) {
    throw new Error(
      'Unsupported or damaged local snapshot. Clear local data and reimport the original.',
    );
  }
  return value;
}

export async function clearDataset(): Promise<void> {
  await transaction('readwrite', (store) => store.delete('current'));
}
