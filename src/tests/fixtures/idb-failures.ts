import { IDBOpenDBRequest, IDBObjectStore, IDBVersionChangeEvent } from 'fake-indexeddb';
import { vi } from 'vitest';

export function failNextOpen(event: 'error' | 'blocked', error: DOMException | null = null) {
  vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
    const request = new IDBOpenDBRequest();
    Object.defineProperty(request, 'error', { value: error });
    queueMicrotask(() => {
      if (event === 'error') request.onerror?.(new Event('error'));
      else
        request.onblocked?.(new IDBVersionChangeEvent('blocked', { oldVersion: 1, newVersion: 2 }));
    });
    return request;
  });
}

export function interruptWrites(
  mode: 'pending' | 'after-success' | 'error-event',
  reportedError: DOMException | null = null,
) {
  const put = IDBObjectStore.prototype.put;
  return vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<IDBObjectStore['put']>
  ) {
    const request = put.apply(this, args);
    const interrupt = () => {
      if (reportedError) Object.defineProperty(this.transaction, 'error', { value: reportedError });
      if (mode === 'error-event') this.transaction.onerror?.(new Event('error'));
      this.transaction.abort();
    };
    if (mode === 'pending') queueMicrotask(interrupt);
    else request.addEventListener('success', interrupt);
    return request;
  });
}
