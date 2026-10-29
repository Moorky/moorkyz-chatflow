import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { IMPORT_LIMITS, importBytes, readArchive } from '../../src/importer/archive';
import { normalizeExport } from '../../src/importer/normalize';
import { branchMessages } from '../../src/shared/model';
import { branchConversation, conversation } from '../fixtures/synthetic';

describe('official export normalization', () => {
  it.each([1, 100, 3000, 10000, 25000])(
    'preserves %i messages without recursive graph traversal',
    (count) => {
      const texts = Array.from(
        { length: count },
        (_, i) => `Message ${i}: Unicode \u{1f680} \u4e2d\u6587 \u0645\u0631\u062d\u0628\u0627`,
      );
      const dataset = normalizeExport(
        [[conversation('long-chat', texts)]],
        'hash',
        'synthetic.json',
      );
      const chat = dataset.conversations[0]!;
      expect(chat.messages).toHaveLength(count);
      expect(branchMessages(chat, 'active-path')).toHaveLength(count);
      expect(chat.messages.at(-1)?.text).toBe(texts.at(-1));
    },
  );

  it('distinguishes canonical and alternate branches without duplicating shared messages', () => {
    const dataset = normalizeExport([[branchConversation()]], 'hash', 'synthetic.json');
    const chat = dataset.conversations[0]!;
    expect(branchMessages(chat, 'active-path').map((m) => m.id)).toEqual([
      'question-id',
      'active-id',
    ]);
    expect(branchMessages(chat, 'all-branches')).toHaveLength(3);
    expect(chat.messages[0]?.timestamp).toBeNull();
    expect(chat.originalUrl).toBeNull();
  });

  it('does not silently guess an active branch or fabricate a missing official ID', () => {
    const raw = conversation();
    delete raw.current_node;
    delete raw.id;
    const chat = normalizeExport([[raw]], 'hash', 'synthetic.json').conversations[0]!;
    expect(chat.originalId).toBeNull();
    expect(chat.id).toMatch(/^local:/);
    expect(branchMessages(chat, 'active-path')).toHaveLength(0);
    expect(branchMessages(chat, 'all-branches')).toHaveLength(2);
    expect(chat.warnings.join(' ')).toContain('Active branch unavailable');
    expect(chat.originalUrl).toBeNull();
  });

  it('rejects duplicate chat IDs and graph cycles rather than dropping records', () => {
    expect(() => normalizeExport([[conversation(), conversation()]], 'hash', 'x')).toThrow(
      'Duplicate conversation ID',
    );
    const raw = conversation();
    raw.mapping = { cycle: { parent: 'cycle', message: null } };
    raw.current_node = 'cycle';
    expect(() => normalizeExport([[raw]], 'hash', 'x')).toThrow('Cycle');
  });

  it('rejects corrupt schemas and missing parents explicitly', () => {
    expect(() => normalizeExport([{}], 'hash', 'x')).toThrow('Unsupported schema');
    expect(() => normalizeExport([[{ id: 'bad' }]], 'hash', 'x')).toThrow('mapping');
    expect(() =>
      normalizeExport(
        [[{ ...conversation(), mapping: { node: { parent: 'absent' } } }]],
        'hash',
        'x',
      ),
    ).toThrow('Missing parent');
  });

  it('retains attachment references but does not claim their content is available', () => {
    const raw = {
      id: 'media',
      current_node: 'image',
      mapping: {
        image: {
          parent: null,
          message: {
            id: 'image-message',
            create_time: 'not-a-date',
            author: { role: 'future-role' },
            content: { parts: ['Exact text', { asset_pointer: 'file-service://image' }] },
          },
        },
      },
    };
    const chat = normalizeExport([[raw]], 'hash', 'x').conversations[0]!;
    expect(chat.messages[0]).toMatchObject({
      text: 'Exact text',
      role: 'unknown',
      timestamp: null,
      contentKind: 'multimodal',
      attachmentRefs: ['file-service://image'],
    });
    expect(chat.warnings.join(' ')).toContain('not indexed or copied');
  });

  it('accepts only safe source-supplied conversation URLs', () => {
    const urls = [
      'https://chatgpt.com/c/abc-123',
      'javascript:alert(1)',
      'https://evil.example/c/abc',
      'https://chatgpt.com.evil.example/c/abc',
      'https://chatgpt.com/c/abc?secret=1',
      'https://chatgpt.com/c/abc#fake-message',
      'https://user:password@chatgpt.com/c/abc',
    ];
    urls.forEach((url, i) => {
      const chat = normalizeExport([[{ ...conversation('abc-123'), url }]], 'hash', 'x')
        .conversations[0]!;
      expect(chat.originalUrl).toBe(i === 0 ? urls[0] : null);
    });
    expect(
      normalizeExport([[{ ...conversation('other'), url: urls[0] }]], 'hash', 'x').conversations[0]
        ?.originalUrl,
    ).toBeNull();
  });
});

describe('ZIP and source handling', () => {
  it('rejects input one byte beyond the explicit 128 MiB safety budget before hashing', async () => {
    expect(IMPORT_LIMITS.inputBytes).toBe(128 * 1024 * 1024);
    await expect(
      importBytes(new Uint8Array(IMPORT_LIMITS.inputBytes + 1), 'oversized.zip'),
    ).rejects.toThrow('128 MiB');
  });
  it('imports all numbered segments and calculates a real source fingerprint', async () => {
    const archive = zipSync({
      'history/conversations-2.json': strToU8(JSON.stringify([conversation('two')])),
      'history/conversations-1.json': strToU8(JSON.stringify([conversation('one')])),
      'unrelated.txt': strToU8('not indexed'),
    });
    const dataset = await importBytes(archive, 'synthetic.zip');
    expect(dataset.conversations.map((c) => c.id)).toEqual(['one', 'two']);
    expect(dataset.sourceExportId).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects traversal entries even if they are not conversation files', () => {
    const archive = zipSync({
      '../evil.txt': strToU8('no'),
      'conversations.json': strToU8('[]'),
    });
    expect(() => readArchive(archive)).toThrow('Unsafe path');
  });

  it('reports empty, malformed, unsupported and non-conversation imports', async () => {
    await expect(importBytes(new Uint8Array(), 'empty')).rejects.toThrow('empty');
    await expect(importBytes(strToU8('{broken'), 'bad.json')).rejects.toThrow('Invalid JSON');
    await expect(importBytes(strToU8('{"unsupported":true}'), 'bad.json')).rejects.toThrow(
      'Unsupported schema',
    );
    expect(() => readArchive(zipSync({ 'other.json': strToU8('[]') }))).toThrow('No conversations');
  });

  it('rejects truncated archives and corrupted uncompressed content', () => {
    const archive = zipSync({ 'conversations.json': [strToU8('[  ]'), { level: 0 }] });
    expect(() => readArchive(archive.subarray(0, archive.length - 10))).toThrow('truncated ZIP');
    const damaged = archive.slice();
    const nameLength = new DataView(damaged.buffer).getUint16(26, true);
    damaged[30 + nameLength + 1] = 0x31;
    expect(() => readArchive(damaged)).toThrow('integrity check');
  });

  it('checks declared ZIP expansion before decompression', () => {
    const archive = zipSync({ 'conversations.json': strToU8('[]') });
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    for (let i = 0; i < archive.length - 46; i++) {
      if (view.getUint32(i, true) === 0x02014b50) {
        view.setUint32(i + 24, 300 * 1024 * 1024, true);
        break;
      }
    }
    expect(() => readArchive(archive)).toThrow('expansion safety');
  });
});
