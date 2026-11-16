import { strToU8, zipSync } from 'fflate';
import { normalizeExport } from '../importer/normalize';
import { contains, evaluate, parseQuery } from '../search/query';
import { errorMessage } from '../shared/model';
import { AccessError, conversationId, identifier } from './chatgpt';
import type { ConversationAdapter, InventoryItem } from './chatgpt';
import { exportFilename, serializeConversation } from './serialize';
import { sha256 } from '../shared/integrity';

export interface ExtractionOptions {
  mode: 'single' | 'keywords' | 'project' | 'all';
  target: string;
  query: string;
  fields: 'title' | 'both';
  workspaceId: string;
  concurrency: number;
  includeArchived: boolean;
}
export interface ExtractionEntry {
  item: InventoryItem;
  status: 'exported' | 'filtered' | 'failed';
  filename: string | null;
  error: string | null;
  messages: number;
}
export interface ExtractionState {
  version: 1;
  id: string;
  accountKey: string;
  options: ExtractionOptions;
  startTime: string;
  endTime: string | null;
  status:
    | 'discovering'
    | 'running'
    | 'paused'
    | 'cancelled'
    | 'failed'
    | 'completed'
    | 'completed-with-errors';
  inventory: InventoryItem[];
  entries: Record<string, ExtractionEntry>;
  warnings: string[];
  error: string | null;
}
export interface ExtractionDocument {
  raw: Record<string, unknown>;
  document: ReturnType<typeof serializeConversation>;
}
export interface ExtractionStore {
  save(state: ExtractionState): Promise<void>;
  put(id: string, document: ExtractionDocument): Promise<void>;
  get(id: string): Promise<ExtractionDocument | undefined>;
}

export function validateExtractionOptions(options: ExtractionOptions) {
  if (!['single', 'keywords', 'project', 'all'].includes(options.mode))
    throw new Error('Unknown export mode.');
  if (!['title', 'both'].includes(options.fields)) throw new Error('Unknown search scope.');
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 4)
    throw new Error('Choose concurrency from 1 to 4.');
  if (options.workspaceId) identifier(options.workspaceId);
  if (options.mode === 'single') conversationId(options.target);
  if (options.mode === 'project') identifier(options.target.trim());
  if (options.mode === 'keywords') {
    if (!options.query.trim()) throw new Error('Enter a search expression.');
    parseQuery(options.query);
  }
}

export function newExtraction(options: ExtractionOptions, accountKey: string): ExtractionState {
  validateExtractionOptions(options);
  return {
    version: 1,
    id: crypto.randomUUID(),
    accountKey,
    options: { ...options },
    startTime: new Date().toISOString(),
    endTime: null,
    status: 'discovering',
    inventory: [],
    entries: {},
    warnings: [
      'Experimental internal API adapter. Discovery and graph completeness are unverified. Project-only/hidden conversations may not appear in the account inventory.',
    ],
    error: null,
  };
}

export async function runExtraction(
  state: ExtractionState,
  adapter: ConversationAdapter,
  store: ExtractionStore,
  signal: AbortSignal,
  progress: (state: ExtractionState) => void,
): Promise<void> {
  validateExtractionOptions(state.options);
  if (state.accountKey !== adapter.accountKey)
    throw new Error(
      'The saved checkpoint belongs to a different account/workspace. Start a new operation.',
    );
  const query = parseQuery(state.options.mode === 'keywords' ? state.options.query : '');
  const match = (texts: string[]) =>
    evaluate(query, (term, wildcard) =>
      texts.some((text) => contains(text, term, false, wildcard)),
    );
  const checkpoint = async () => {
    await store.save(state);
    progress(state);
  };
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const pending = new Map(state.inventory.map((item) => [item.id, item]));
  state.error = null;
  state.endTime = null;
  try {
    state.status = 'discovering';
    await checkpoint();
    if (state.options.mode === 'single') {
      const id = conversationId(state.options.target);
      pending.set(id, { id, title: '', updatedAt: null, projectId: null, archived: false });
    } else {
      // Repeat discovery on recovery: offset pagination is not a stable account snapshot.
      for (const archived of state.options.includeArchived ? [false, true] : [false]) {
        let offset = 0;
        const pageIds = new Set<string>();
        while (true) {
          controller.signal.throwIfAborted();
          const page = await adapter.page(offset, archived, controller.signal);
          let added = 0;
          for (const item of page.items) {
            if (!pageIds.has(item.id)) added++;
            pageIds.add(item.id);
            const existing = pending.get(item.id);
            pending.set(
              item.id,
              existing ? { ...item, archived: item.archived || existing.archived } : item,
            );
          }
          state.inventory = [...pending.values()];
          if (state.inventory.length > 5000)
            throw new Error(
              'Prototype safety budget: at most 5,000 discovered conversations per operation. Narrow the export.',
            );
          await checkpoint();
          offset += page.items.length;
          if (offset >= page.total) break;
          if (!page.items.length || !added)
            throw new Error(
              'Inventory pagination stopped making progress before its reported total. Resume later; completeness is unverified.',
            );
        }
      }
    }
    state.inventory = [...pending.values()];
    if (state.options.mode === 'project') {
      const projectId = state.options.target.trim();
      state.inventory = state.inventory.filter((item) => item.projectId === projectId);
      if (!state.inventory.length)
        throw new Error(
          'No inventory conversations have that exact project ID. Project-only discovery is not guaranteed by this adapter.',
        );
    }
    if (state.inventory.length > 5000)
      throw new Error(
        'Prototype safety budget: at most 5,000 discovered conversations per operation. Narrow the export.',
      );
    state.status = 'running';
    await checkpoint();
    let cursor = 0;
    let fatal: unknown;
    let persistence = Promise.resolve();
    const serialCheckpoint = () => {
      persistence = persistence.then(checkpoint);
      return persistence;
    };
    const task = async () => {
      while (cursor < state.inventory.length && !controller.signal.aborted) {
        const item = state.inventory[cursor++]!;
        const previous = state.entries[item.id];
        if (
          previous?.status === 'exported' &&
          item.updatedAt !== null &&
          previous.item.updatedAt === item.updatedAt &&
          previous.item.title === item.title
        ) {
          const saved = await store.get(item.id);
          if (saved) continue;
        }
        try {
          if (
            state.options.mode === 'keywords' &&
            state.options.fields === 'title' &&
            !match([item.title])
          ) {
            state.entries[item.id] = {
              item,
              status: 'filtered',
              filename: null,
              error: null,
              messages: 0,
            };
          } else {
            const startedAt = new Date().toISOString();
            const raw = await adapter.conversation(item.id, controller.signal);
            const normalized = normalizeExport([[raw]], 'direct', 'ChatGPT response')
              .conversations[0]!;
            if (
              state.options.mode === 'keywords' &&
              state.options.fields === 'both' &&
              !match([normalized.title, ...normalized.messages.map((message) => message.text)])
            ) {
              state.entries[item.id] = {
                item,
                status: 'filtered',
                filename: null,
                error: null,
                messages: 0,
              };
            } else {
              const document = serializeConversation(raw, state.id, startedAt, normalized);
              await store.put(item.id, { raw, document });
              state.entries[item.id] = {
                item,
                status: 'exported',
                filename: document.filename,
                error: null,
                messages: document.messages.length,
              };
            }
          }
        } catch (error) {
          if (controller.signal.aborted) throw error;
          if (error instanceof AccessError && [401, 403, 429].includes(error.status)) throw error;
          state.entries[item.id] = {
            item,
            status: 'failed',
            filename: null,
            error: errorMessage(error),
            messages: 0,
          };
        }
        await serialCheckpoint();
      }
    };
    await Promise.all(
      Array.from({ length: state.options.concurrency }, async () => {
        try {
          await task();
        } catch (error) {
          if (fatal === undefined) fatal = error;
          controller.abort();
        }
      }),
    );
    await persistence;
    if (fatal !== undefined) throw fatal;
    controller.signal.throwIfAborted();
    state.status = Object.values(state.entries).some((entry) => entry.status === 'failed')
      ? 'completed-with-errors'
      : 'completed';
    state.endTime = new Date().toISOString();
    await checkpoint();
  } catch (error) {
    state.status = signal.aborted
      ? signal.reason === 'cancel'
        ? 'cancelled'
        : 'paused'
      : error instanceof AccessError && [401, 403, 429].includes(error.status)
        ? 'paused'
        : 'failed';
    state.error = signal.aborted ? null : errorMessage(error);
    await checkpoint();
  } finally {
    signal.removeEventListener('abort', abort);
  }
}

export async function extractionBundle(state: ExtractionState, store: ExtractionStore) {
  const files: Record<string, Uint8Array> = {};
  const raw: Record<string, unknown>[] = [];
  let bytes = 0;
  for (const entry of Object.values(state.entries)) {
    if (entry.status !== 'exported') continue;
    const saved = await store.get(entry.item.id);
    if (!saved) throw new Error('A checkpoint conversation is missing. Resume before downloading.');
    const filename = exportFilename(
      saved.document.conversation.title,
      saved.document.startTime,
      entry.item.id,
    );
    if (
      saved.document.filename !== filename ||
      saved.document.source.conversationId !== entry.item.id ||
      saved.raw.id !== entry.item.id
    )
      throw new Error(
        'A checkpoint conversation identity or filename is damaged. Start a new export.',
      );
    const body = strToU8(JSON.stringify(saved.document, null, 2));
    const source = JSON.stringify(saved.raw);
    bytes += body.length + strToU8(source).length;
    if (bytes > 96 * 1024 * 1024)
      throw new Error(
        'Prototype download exceeds the 96 MiB safety budget. Start a narrower export; checkpoints were preserved.',
      );
    files[`conversations/${filename}`] = body;
    raw.push(saved.raw);
  }
  files['conversations.json'] = strToU8(JSON.stringify(raw));
  if (state.options.mode === 'project')
    files['projects/manifest.json'] = strToU8(
      JSON.stringify(
        {
          projectId: state.options.target,
          instructions: null,
          files: [],
          availability:
            'Instructions and project files were not requested; inventory membership only.',
          conversationIds: Object.values(state.entries)
            .filter((entry) => entry.status === 'exported')
            .map((entry) => entry.item.id),
        },
        null,
        2,
      ),
    );
  const checksums = await Promise.all(
    Object.entries(files).map(async ([path, data]) => ({
      path,
      size: data.length,
      sha256: await sha256(data),
    })),
  );
  files['manifest.json'] = strToU8(
    JSON.stringify(
      {
        ...state,
        completeness: 'unverified',
        counts: {
          discovered: state.inventory.length,
          exported: Object.values(state.entries).filter((entry) => entry.status === 'exported')
            .length,
          skipped: Object.values(state.entries).filter((entry) => entry.status === 'filtered')
            .length,
          failed: Object.values(state.entries).filter((entry) => entry.status === 'failed').length,
          messages: Object.values(state.entries).reduce((sum, entry) => sum + entry.messages, 0),
        },
        recovery: 'Rerun the same script in the same browser profile and workspace, then Resume.',
        files: checksums,
      },
      null,
      2,
    ),
  );
  return zipSync(files, { level: 1 });
}
