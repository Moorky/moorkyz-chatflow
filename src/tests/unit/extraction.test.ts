import { describe, expect, it, vi } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { AccessError, connectChatGPT, conversationId, identifier } from '../../extraction/chatgpt';
import type { ConversationAdapter, InventoryItem } from '../../extraction/chatgpt';
import {
  extractionBundle,
  newExtraction,
  runExtraction,
  validateExtractionOptions,
} from '../../extraction/engine';
import type {
  ExtractionDocument,
  ExtractionOptions,
  ExtractionStore,
} from '../../extraction/engine';
import { classifyContent, exportFilename, serializeConversation } from '../../extraction/serialize';
import { importBytes } from '../../importer/archive';
import { branchConversation, conversation } from '../fixtures/synthetic';

const defaults: ExtractionOptions = {
  mode: 'all',
  target: '',
  query: '',
  fields: 'title',
  workspaceId: '',
  concurrency: 2,
  includeArchived: false,
};
const item = (id: string, title = id, projectId: string | null = null): InventoryItem => ({
  id,
  title,
  projectId,
  archived: false,
  updatedAt: '2026-11-16',
});

function harness(items = [item('one'), item('two')]) {
  const documents = new Map<string, ExtractionDocument>();
  const store: ExtractionStore = {
    save: vi.fn(async () => {}),
    put: vi.fn(async (id, document) => {
      documents.set(id, structuredClone(document));
    }),
    get: vi.fn(async (id) => documents.get(id)),
  };
  const adapter: ConversationAdapter = {
    accountKey: 'synthetic-account',
    page: vi.fn(async (offset) => ({
      total: items.length,
      items: structuredClone(items.slice(offset, offset + 1)),
    })),
    conversation: vi.fn(async (id) => conversation(id, [`content ${id}`], `${id} full title`)),
  };
  const state = newExtraction(defaults, adapter.accountKey);
  const controller = new AbortController();
  const progress = vi.fn();
  const run = () => runExtraction(state, adapter, store, controller.signal, progress);
  return { documents, store, adapter, state, controller, progress, run };
}

describe('same-origin read-only adapter', () => {
  it('handles a rate limit without a Retry-After header', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ user: { id: 'u' }, accessToken: 'synthetic' }))
      .mockResolvedValue(new Response('', { status: 429 }));
    const adapter = await connectChatGPT(fetcher, '', new AbortController().signal);
    await expect(adapter.page(0, false, new AbortController().signal)).rejects.toThrow(
      'Pause and retry later.',
    );
  });
  it('uses the existing session without persisting or exporting credentials', async () => {
    const fetcher = vi.fn<typeof fetch>(async (url) => {
      if (String(url).endsWith('/api/auth/session'))
        return Response.json({
          user: { id: 'synthetic-user' },
          accessToken: 'SYNTHETIC-NOT-A-REAL-TOKEN',
        });
      if (String(url).includes('/conversations?'))
        return Response.json({
          items: [
            { id: 'one', title: 'One', update_time: 5, gizmo_id: 'g-project' },
            { id: 'two', title: 'Two' },
          ],
          total: 2,
        });
      return Response.json({ ...conversation('one'), id: undefined, conversation_id: 'one' });
    });
    const signal = new AbortController().signal;
    const adapter = await connectChatGPT(fetcher, 'workspace', signal);
    expect(adapter.accountKey).toMatch(/^[a-f0-9]{64}$/);
    const page = await adapter.page(10, true, signal);
    expect(page.items[0]).toMatchObject({
      id: 'one',
      archived: true,
      projectId: 'g-project',
      updatedAt: '5',
    });
    expect(page.items[1]).toMatchObject({ projectId: null, updatedAt: null });
    expect(await adapter.conversation('one', signal)).toMatchObject({
      id: 'one',
      url: 'https://chatgpt.com/c/one',
    });
    const request = fetcher.mock.calls[1]!;
    expect(String(request[0])).toContain('offset=10&limit=100&order=updated&is_archived=true');
    expect(request[1]).toMatchObject({
      credentials: 'same-origin',
      redirect: 'error',
      headers: { 'ChatGPT-Account-ID': 'workspace' },
    });
    expect(
      fetcher.mock.calls.every(
        (call) =>
          new URL(String(call[0])).origin === 'https://chatgpt.com' &&
          call[1]?.method === undefined,
      ),
    ).toBe(true);
    const personal = await connectChatGPT(fetcher, '', signal);
    expect(personal.accountKey).not.toBe(adapter.accountKey);
  });

  it.each([401, 403, 429, 404, 500])(
    'surfaces HTTP %i without retry loops or response bodies',
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          Response.json({ user: { id: 'synthetic-user' }, accessToken: 'synthetic' }),
        )
        .mockResolvedValue(
          new Response('PRIVATE RESPONSE MUST NOT LEAK', {
            status,
            headers: { 'Retry-After': '60' },
          }),
        );
      const signal = new AbortController().signal;
      const adapter = await connectChatGPT(fetcher, '', signal);
      await expect(adapter.page(0, false, signal)).rejects.toBeInstanceOf(AccessError);
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    new Response('', { status: 401 }),
    Response.json({ user: { id: 'u' } }),
    Response.json({ user: {}, accessToken: 'synthetic' }),
    Response.json([]),
    Response.json({}),
  ])('rejects expired or changed sessions', async (response) => {
    await expect(
      connectChatGPT(
        vi.fn<typeof fetch>().mockResolvedValue(response),
        '',
        new AbortController().signal,
      ),
    ).rejects.toThrow();
  });

  it.each([
    { items: [], total: -1 },
    { items: [], total: '2' },
    { total: 0 },
    { items: [null], total: 1 },
    { items: [{ id: 'a' }], total: 1 },
  ])('refuses unsupported inventory shapes', async (inventory) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ user: { id: 'u' }, accessToken: 's' }))
      .mockResolvedValue(Response.json(inventory));
    const adapter = await connectChatGPT(fetcher, '', new AbortController().signal);
    await expect(adapter.page(0, false, new AbortController().signal)).rejects.toThrow();
  });

  it('refuses a response for a different conversation', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ user: { id: 'u' }, accessToken: 's' }))
      .mockResolvedValue(Response.json(conversation('other')));
    const adapter = await connectChatGPT(fetcher, '', new AbortController().signal);
    await expect(adapter.conversation('wanted', new AbortController().signal)).rejects.toThrow(
      'identity mismatch',
    );
  });
  it.each(['../secrets', '', '__proto__', 'constructor', 'prototype', 'a?b'])(
    'rejects unsafe IDs %j',
    (id) => {
      expect(() => identifier(id)).toThrow();
    },
  );
  it.each([
    ['https://chatgpt.com/c/chat-id', 'chat-id'],
    ['https://chatgpt.com/g/g-project/c/chat-id?model=x', 'chat-id'],
    ['chat-id', 'chat-id'],
  ])('resolves conversation %s', (url, id) => {
    expect(conversationId(url)).toBe(id);
  });
  it.each([
    'https://evil.example/c/chat-id',
    'https://u@chatgpt.com/c/chat-id',
    'https://chatgpt.com/g/project',
  ])('rejects unsafe source URL %s', (url) => {
    expect(() => conversationId(url)).toThrow();
  });
});

describe('shared extraction lifecycle', () => {
  it.each(['filename', 'document-id', 'raw-id'])(
    'rejects damaged checkpoint %s rather than emitting unsafe ZIP entries',
    async (field) => {
      const h = harness([item('one')]);
      await h.run();
      const saved = h.documents.get('one')!;
      if (field === 'filename') saved.document.filename = '../../outside.json';
      else if (field === 'document-id') saved.document.source.conversationId = 'other';
      else saved.raw.id = 'other';
      await expect(extractionBundle(h.state, h.store)).rejects.toThrow(
        'identity or filename is damaged',
      );
    },
  );
  it('stops concurrent access failures while retaining the first actionable error', async () => {
    const h = harness();
    h.adapter.conversation = vi.fn(async () => {
      throw new AccessError('Sign in before resuming', 401);
    });
    await h.run();
    expect(h.state.status).toBe('paused');
    expect(h.state.error).toBe('Sign in before resuming');
    expect(h.adapter.conversation).toHaveBeenCalledTimes(2);
  });

  it('guards oversized restored inventory before single-conversation processing', async () => {
    const h = harness();
    h.state.options = { ...defaults, mode: 'single', target: 'one' };
    h.state.inventory = Array.from({ length: 5001 }, (_, index) => item(`old-${index}`));
    await h.run();
    expect(h.state.status).toBe('failed');
    expect(h.state.error).toContain('5,000');
    expect(h.adapter.conversation).not.toHaveBeenCalled();
  });

  it('omits failed conversations from payloads but records them in the manifest', async () => {
    const h = harness();
    h.adapter.conversation = vi.fn(async (id) => {
      if (id === 'two') throw new AccessError('Unavailable', 404);
      return conversation(id);
    });
    await h.run();
    const files = unzipSync(await extractionBundle(h.state, h.store));
    expect(JSON.parse(strFromU8(files['conversations.json']!))).toHaveLength(1);
    expect(JSON.parse(strFromU8(files['manifest.json']!)).counts.failed).toBe(1);
  });

  it('preserves checkpoints when aggregate download data exceeds 96 MiB', async () => {
    const h = harness([item('one')]);
    await h.run();
    const saved = h.documents.get('one')!;
    const metadata = 'x'.repeat(48 * 1024 * 1024);
    saved.raw.additionalMetadata = metadata;
    saved.document.messages[0]!.source.additionalMetadata = metadata;
    await expect(extractionBundle(h.state, h.store)).rejects.toThrow('96 MiB safety budget');
    expect(h.documents.has('one')).toBe(true);
  });
  it('paginates, deduplicates archived inventory, bounds concurrency and generates importer-compatible ZIPs', async () => {
    const h = harness();
    h.state.options.includeArchived = true;
    let active = 0;
    let maximum = 0;
    h.adapter.conversation = vi.fn(async (id) => {
      active++;
      maximum = Math.max(active, maximum);
      await Promise.resolve();
      active--;
      return conversation(id);
    });
    await h.run();
    expect(h.state.status).toBe('completed');
    expect(h.state.inventory).toHaveLength(2);
    expect(h.adapter.page).toHaveBeenCalledTimes(4);
    expect(h.adapter.conversation).toHaveBeenCalledTimes(2);
    expect(maximum).toBeLessThanOrEqual(2);
    expect(h.state.endTime).not.toBeNull();
    const zip = await extractionBundle(h.state, h.store);
    const files = unzipSync(zip);
    expect(Object.keys(files).filter((name) => name.startsWith('conversations/'))).toHaveLength(2);
    const manifest = JSON.parse(strFromU8(files['manifest.json']!));
    expect(manifest.counts).toEqual({
      discovered: 2,
      exported: 2,
      skipped: 0,
      failed: 0,
      messages: 4,
    });
    expect(manifest.completeness).toBe('unverified');
    const imported = await importBytes(zip, 'direct.zip');
    expect(imported.conversations).toHaveLength(2);
    expect(imported.conversations[0]?.messages).toHaveLength(2);
  });

  it('exports a single URL without account discovery', async () => {
    const h = harness();
    h.state.options = { ...defaults, mode: 'single', target: 'https://chatgpt.com/c/one' };
    await h.run();
    expect(h.adapter.page).not.toHaveBeenCalled();
    expect(h.adapter.conversation).toHaveBeenCalledExactlyOnceWith('one', expect.any(AbortSignal));
    expect(h.state.status).toBe('completed');
  });

  it('filters titles before extraction, including Boolean wildcard expressions', async () => {
    const h = harness([item('one', 'Moorkyz prototype'), item('two', 'Other')]);
    h.state.options = { ...defaults, mode: 'keywords', query: 'moor* NOT test' };
    await h.run();
    expect(h.adapter.conversation).toHaveBeenCalledTimes(1);
    expect(h.state.entries.two?.status).toBe('filtered');
  });

  it('evaluates title/message conditions across messages and filters nonmatches', async () => {
    const h = harness();
    h.state.options = { ...defaults, mode: 'keywords', fields: 'both', query: 'full AND one' };
    await h.run();
    expect(h.adapter.conversation).toHaveBeenCalledTimes(2);
    expect(h.state.entries.one?.status).toBe('exported');
    expect(h.state.entries.two?.status).toBe('filtered');
  });

  it('preserves actual project membership and emits a project manifest', async () => {
    const h = harness([
      item('one', 'Does not mention project', 'g-project'),
      item('two', 'g-project title'),
    ]);
    h.state.options = { ...defaults, mode: 'project', target: 'g-project' };
    await h.run();
    expect(h.state.inventory.map((item) => item.id)).toEqual(['one']);
    const files = unzipSync(await extractionBundle(h.state, h.store));
    expect(JSON.parse(strFromU8(files['projects/manifest.json']!)).conversationIds).toEqual([
      'one',
    ]);
  });

  it('reports unresolved project IDs and stuck pagination instead of false completion', async () => {
    const h = harness();
    h.state.options = { ...defaults, mode: 'project', target: 'missing' };
    await h.run();
    expect(h.state.status).toBe('failed');
    expect(h.state.error).toContain('exact project ID');
    h.state.options = { ...defaults };
    h.adapter.page = vi.fn(async () => ({ total: 3, items: [item('one')] }));
    await h.run();
    expect(h.state.error).toContain('making progress');
    h.adapter.page = vi.fn(async () => ({ total: 3, items: [] }));
    await h.run();
    expect(h.state.status).toBe('failed');
  });

  it('continues after malformed or inaccessible conversations, then retries failed entries on resume', async () => {
    const h = harness();
    h.adapter.conversation = vi.fn(async (id) => {
      if (id === 'one') throw new AccessError('Not found', 404);
      return { id, mapping: { node: { parent: 'missing' } } };
    });
    await h.run();
    expect(h.state.status).toBe('completed-with-errors');
    expect(Object.values(h.state.entries).every((entry) => entry.status === 'failed')).toBe(true);
    h.adapter.conversation = vi.fn(async (id) => conversation(id));
    await h.run();
    expect(h.state.status).toBe('completed');
    expect(Object.values(h.state.entries).every((entry) => entry.status === 'exported')).toBe(true);
  });

  it.each([401, 403, 429])(
    'pauses on access/rate error %i without storming remaining chats',
    async (status) => {
      const h = harness();
      h.state.options.concurrency = 1;
      h.adapter.conversation = vi.fn(async () => {
        throw new AccessError('Resume later', status);
      });
      await h.run();
      expect(h.state.status).toBe('paused');
      expect(h.state.error).toBe('Resume later');
      expect(h.adapter.conversation).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['pause', 'cancel'])('checkpoints on %s and permits recovery', async (reason) => {
    const h = harness();
    h.controller.abort(reason);
    await h.run();
    expect(h.state.status).toBe(reason === 'cancel' ? 'cancelled' : 'paused');
    expect(h.state.error).toBeNull();
    await runExtraction(h.state, h.adapter, h.store, new AbortController().signal, h.progress);
    expect(h.state.status).toBe('completed');
  });

  it.each(['pause', 'cancel'])(
    'retains a saved chat when %s interrupts the next extraction',
    async (reason) => {
      const h = harness();
      h.state.options.concurrency = 1;
      h.adapter.conversation = vi.fn(async (id, signal) => {
        if (id === 'two') h.controller.abort(reason);
        signal.throwIfAborted();
        return conversation(id);
      });
      await h.run();
      expect(h.state.entries.one?.status).toBe('exported');
      expect(h.state.entries.two).toBeUndefined();
      expect(h.state.status).toBe(reason === 'cancel' ? 'cancelled' : 'paused');
      expect(
        unzipSync(await extractionBundle(h.state, h.store))['conversations.json'],
      ).toBeDefined();
      await runExtraction(h.state, h.adapter, h.store, new AbortController().signal, h.progress);
      expect(h.state.status).toBe('completed');
      expect(h.adapter.conversation).toHaveBeenCalledTimes(3);
    },
  );

  it('skips unchanged saved entries, re-fetches changed or missing ones and rejects cross-account recovery', async () => {
    const h = harness();
    await h.run();
    await h.run();
    expect(h.adapter.conversation).toHaveBeenCalledTimes(2);
    h.documents.delete('one');
    h.state.entries.two!.item.updatedAt = 'old';
    await h.run();
    expect(h.adapter.conversation).toHaveBeenCalledTimes(4);
    h.state.entries.one!.item.updatedAt = null;
    await h.run();
    expect(h.adapter.conversation).toHaveBeenCalledTimes(5);
    await expect(
      runExtraction(
        h.state,
        { ...h.adapter, accountKey: 'other' },
        h.store,
        h.controller.signal,
        h.progress,
      ),
    ).rejects.toThrow('different account');
  });

  it('surfaces persistence failures, including final checkpoint failures', async () => {
    const h = harness();
    vi.mocked(h.store.save).mockRejectedValueOnce(new Error('disk full'));
    await h.run();
    expect(h.state.status).toBe('failed');
    expect(h.state.error).toBe('disk full');
    vi.mocked(h.store.save).mockImplementation(async () => {
      if (h.state.status === 'running') throw new Error('transaction failed');
    });
    await h.run();
    expect(h.state.error).toBe('transaction failed');
  });

  it('refuses over-budget inventory and incomplete downloads', async () => {
    const h = harness(Array.from({ length: 5001 }, (_, index) => item(`c${index}`)));
    h.adapter.page = vi.fn(async () => ({
      items: Array.from({ length: 5001 }, (_, index) => item(`c${index}`)),
      total: 5001,
    }));
    await h.run();
    expect(h.state.error).toContain('5,000');
    const good = harness();
    await good.run();
    good.documents.clear();
    await expect(extractionBundle(good.state, good.store)).rejects.toThrow('missing');
    expect(
      Object.keys(unzipSync(await extractionBundle(newExtraction(defaults, 'a'), good.store))),
    ).toEqual(['conversations.json', 'manifest.json']);
  });

  it.each([
    { mode: 'unknown' },
    { fields: 'unknown' },
    { concurrency: 0 },
    { concurrency: 5 },
    { workspaceId: '../x' },
    { mode: 'single', target: '' },
    { mode: 'project', target: '' },
    { mode: 'keywords', query: '' },
    { mode: 'keywords', query: 'alpha AND' },
  ])('validates options before any network request: %j', (change) => {
    expect(() =>
      validateExtractionOptions({ ...defaults, ...change } as ExtractionOptions),
    ).toThrow();
  });
});

describe('versioned per-conversation serialization', () => {
  it('retains explicit project/archive metadata and distinguishes absent authors/active branches', () => {
    const result = serializeConversation(
      {
        id: 'unknown-author',
        gizmo_id: 'g-project',
        is_archived: true,
        mapping: { root: { parent: null, message: { id: 'm', content: { parts: ['text'] } } } },
      },
      'operation',
      '2026-11-16T00:00:00.000Z',
    );
    expect(result.conversation).toMatchObject({
      projectId: 'g-project',
      archived: true,
      activeBranchId: null,
    });
    expect(result.messages[0]).toMatchObject({ author: null, role: 'unknown', timestamp: null });
  });
  it('preserves all branches, original metadata, content, timestamps and attachment references', () => {
    const raw = branchConversation();
    raw.title = 'Original title: unchanged / 🚀';
    const mapping = raw.mapping as Record<string, { message: Record<string, unknown> | null }>;
    mapping.active!.message!.content = {
      parts: [
        '## Result\n```typescript\nconst x = 1;\n```',
        { asset_pointer: 'file-ref', unknown: 'preserved' },
      ],
    };
    mapping.active!.message!.metadata = {
      model_slug: 'synthetic',
      citations: [{ reference: 'citation' }],
    };
    const document = serializeConversation(raw, 'export', '2026-11-16T21:00:00.000Z');
    expect(document.messages).toHaveLength(3);
    expect(document.messages[2]).toMatchObject({
      timestamp: null,
      parentNodeId: 'question',
      active: true,
      contentTypes: expect.arrayContaining([
        'raw',
        'heading',
        'markdown',
        'code',
        'code.typescript',
        'attachment',
        'unknown',
      ]),
      attachments: [{ reference: 'file-ref', retrievalStatus: 'not-requested' }],
      source: { metadata: { model_slug: 'synthetic', citations: [{ reference: 'citation' }] } },
    });
    expect(document.conversation.title).toBe(raw.title);
    expect(document.statistics.messageCount).toBe(3);
    expect(document.exportResult.completeness).toBe('unverified');
    expect(document.messages[2]!.source.content).toEqual(mapping.active!.message!.content);
    expect(document.messages[0]!.durationSincePreviousMessageMs).toBeNull();
    const ordered = serializeConversation(conversation('dated'), 'e', '2026-11-16T21:00:00.000Z');
    expect(ordered.messages[1]!.durationSincePreviousMessageMs).toBe(1000);
    expect(ordered.statistics.wordCount).toBe(2);
    expect(ordered.statistics.characterCount).toBe(9);
  });

  it('classifies representative structured text while retaining raw source', () => {
    expect(
      classifyContent(
        '- list\n| a | b |\n`inline` [link](https://example.com)\n$$x$$\n```\ncode\n```',
        'text',
        [],
      ).contentTypes,
    ).toEqual(
      expect.arrayContaining([
        'list',
        'table',
        'inline.code',
        'inline.link',
        'math',
        'code',
        'markdown',
      ]),
    );
    expect(classifyContent('', 'unavailable', []).contentTypes).toEqual(['unknown']);
    expect(
      classifyContent('````invalid language\ntext\n```', 'text', []).contentTypes,
    ).not.toContain('code.invalid language');
  });

  it.each(['CON', 'NUL.txt', 'AUX', '.', 'a / b:*?', '文 字', 'a'.repeat(100)])(
    'creates cross-platform safe filename for %s',
    (title) => {
      const name = exportFilename(title, '2026-11-16T21:00:00.000Z', 'chat-id');
      expect(name).toMatch(/_2026-11-16-21-00-00_chat-id\.json$/);
      expect(name).not.toMatch(/[<>:"/\\|?*\p{Cc}]/u);
      expect(name.length).toBeLessThan(140);
    },
  );
  it('rejects invalid filename timestamp/identity', () => {
    expect(() => exportFilename('A', 'bad', 'id')).toThrow('time');
    expect(() => exportFilename('A', new Date().toISOString(), '../id')).toThrow('ID');
    expect(
      new TextEncoder().encode(
        exportFilename('文'.repeat(80), new Date().toISOString(), 'a'.repeat(160)),
      ).length,
    ).toBeLessThanOrEqual(240);
  });
});
