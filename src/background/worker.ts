import { IMPORT_LIMITS, importBytes } from '../importer/archive';
import { SearchIndex } from '../search';
import { exportBundle } from '../exports/export';
import { statistics } from '../analytics/statistics';
import { selectedConversations } from '../selection/selection';
import { clearDataset, loadDataset, saveDataset } from '../storage/database';
import { errorMessage } from '../shared/model';
import type { WorkerRequest, WorkerResponse } from '../shared/model';

let index: SearchIndex | null = null;
let queue = Promise.resolve();

async function handle(request: WorkerRequest): Promise<void> {
  const { id } = request;
  const send = (message: WorkerResponse) => self.postMessage(message);
  try {
    if (request.type === 'import') {
      if (request.file.size > IMPORT_LIMITS.inputBytes) {
        throw new Error('Import exceeds the 128 MiB input safety budget.');
      }
      const dataset = await importBytes(
        new Uint8Array(await request.file.arrayBuffer()),
        request.file.name,
        (message) => send({ id, type: 'progress', message }),
      );
      send({ id, type: 'progress', message: 'Committing local snapshot...' });
      const next = new SearchIndex(dataset);
      await saveDataset(dataset);
      index = next;
      send({ id, type: 'dataset', dataset });
    } else if (request.type === 'restore') {
      const dataset = await loadDataset();
      index = dataset ? new SearchIndex(dataset) : null;
      send({ id, type: 'dataset', dataset });
    } else if (request.type === 'clear') {
      await clearDataset();
      index = null;
      send({ id, type: 'dataset', dataset: null });
    } else if (request.type === 'statistics') {
      if (!index) throw new Error('Import a local export before calculating statistics.');
      const selected = new Set(request.chatIds);
      send({
        id,
        type: 'statistics',
        report: statistics(
          selectedConversations(index.dataset.conversations, selected),
          request.branching,
        ),
      });
    } else if (request.type === 'export') {
      if (!index) throw new Error('Import a local export before exporting.');
      const bundle = await exportBundle(
        index.dataset,
        new Set(request.chatIds),
        request.branching,
        request.format,
        request.kind,
        request.filter,
      );
      send({ id, type: 'download', bytes: bundle.bytes, filename: bundle.filename });
    } else {
      if (!index) throw new Error('Import a local export before searching.');
      send({ id, type: 'results', result: index.search(request.options) });
    }
  } catch (error) {
    send({ id, type: 'error', message: errorMessage(error) });
  }
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  queue = queue.then(() => handle(event.data));
});
