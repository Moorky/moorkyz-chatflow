import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { importBytes, readArchive } from '../../src/importer/archive';
import { normalizeExport } from '../../src/importer/normalize';
import { conversation } from '../fixtures/synthetic';

describe('normalization error and fallback matrix', () => {
  it.each([
    [null, 'not an object'],
    [{ id: 'broken', mapping: { node: null } }, 'Invalid graph node'],
    [{ id: 'broken', current_node: 'absent', mapping: {} }, 'Unknown current_node'],
    [{ id: 'broken', mapping: { node: { parent: null, message: 42 } } }, 'Invalid message'],
    [{ id: 'broken', mapping: { node: { parent: 'node' } } }, 'Disconnected cycle'],
    [
      {
        id: 'broken',
        current_node: 'two',
        mapping: {
          one: { parent: null, message: { id: 'duplicate' } },
          two: { parent: 'one', message: { id: 'duplicate' } },
        },
      },
      'Duplicate message ID',
    ],
  ])('rejects unsupported graph without silent record loss: %j', (raw, error) => {
    expect(() => normalizeExport([[raw]], 'hash', 'example.json')).toThrow(String(error));
  });

  it('uses conversation_id, text-form content, tool roles and attachment metadata when supplied', () => {
    const raw = {
      conversation_id: 'text-form',
      title: '',
      current_node: 'node',
      mapping: {
        node: {
          parent: null,
          message: {
            author: { role: 'tool' },
            create_time: '2026-10-29T00:00:00Z',
            content: { content_type: 'code', text: 'const answer = 42;' },
            metadata: {
              attachments: [{ id: 'file-1' }, { name: 'notes.txt' }, { id: 'file-1' }, null],
            },
          },
        },
      },
    };
    const chat = normalizeExport([[raw]], 'hash', 'example.json').conversations[0]!;
    expect(chat).toMatchObject({ id: 'text-form', title: 'Untitled conversation' });
    expect(chat.messages[0]).toMatchObject({
      id: 'local:message:node',
      role: 'tool',
      text: 'const answer = 42;',
      timestamp: '2026-10-29T00:00:00.000Z',
      attachmentRefs: ['file-1', 'notes.txt'],
      contentKind: 'multimodal',
      active: true,
    });
    expect(chat.warnings.join(';')).toContain('Missing message ID');
  });

  it('preserves empty text and source parts without inventing timestamps', () => {
    const raw = {
      ...conversation('empty-text'),
      current_node: 'node',
      mapping: {
        node: {
          parent: null,
          message: { id: 'empty', content: { parts: ['', 'line two', '\n'] } },
        },
      },
      create_time: false,
      update_time: 'invalid',
    };
    const chat = normalizeExport([[raw]], 'hash', 'example.json').conversations[0]!;
    expect(chat.messages[0]).toMatchObject({
      text: '\nline two\n\n',
      role: 'unknown',
      timestamp: null,
    });
    expect(chat.createdAt).toBeNull();
    expect(chat.updatedAt).toBeNull();
    expect(chat.warnings).toHaveLength(2);
  });
});

function archive() {
  return zipSync({
    'conversations.json': [strToU8(JSON.stringify([conversation()])), { level: 0 }],
  });
}
function directoryOffset(bytes: Uint8Array) {
  return new DataView(bytes.buffer).getUint32(bytes.length - 6, true);
}

describe('archive validation matrix', () => {
  it.each([
    ['absolute path', '/outside.json'],
    ['drive path', 'C:/outside.json'],
    ['backslash', 'folder\\conversations.json'],
    ['dot segment', './conversations.json'],
    ['parent segment', 'a/../conversations.json'],
    ['null byte', 'bad\0name.json'],
  ])('rejects %s', (_label, path) => {
    expect(() => readArchive(zipSync({ [path]: strToU8('[]') }))).toThrow('Unsafe path');
  });

  it.each([
    'multi-disk',
    'ZIP64',
    'encrypted',
    'directory bounds',
    'directory signature',
    'name bounds',
    'entry budget',
  ] as const)('rejects %s archives with an explicit error', (kind) => {
    const bytes = archive();
    const view = new DataView(bytes.buffer);
    const end = bytes.length - 22;
    const directory = directoryOffset(bytes);
    if (kind === 'multi-disk') view.setUint16(end + 4, 1, true);
    if (kind === 'ZIP64') view.setUint32(end + 16, 0xffffffff, true);
    if (kind === 'encrypted') view.setUint16(directory + 8, 1, true);
    if (kind === 'directory bounds') view.setUint32(end + 12, 0, true);
    if (kind === 'directory signature') view.setUint32(directory, 0, true);
    if (kind === 'name bounds') view.setUint16(directory + 28, 0xffff, true);
    if (kind === 'entry budget') {
      view.setUint16(end + 8, 10001, true);
      view.setUint16(end + 10, 10001, true);
    }
    expect(() => readArchive(bytes)).toThrow();
  });

  it('accepts a valid archive comment containing the ZIP end signature', () => {
    const comment = `valid comment PK\u0005\u0006${'x'.repeat(30)}`;
    const base = zipSync({ 'conversations.json': strToU8('[]') });
    const commentBytes = strToU8(comment);
    const bytes = new Uint8Array(base.length + commentBytes.length);
    bytes.set(base);
    bytes.set(commentBytes, base.length);
    new DataView(bytes.buffer).setUint16(base.length - 2, commentBytes.length, true);
    expect(readArchive(bytes)).toEqual(['[]']);
  });

  it('rejects local headers whose filename does not match the directory', () => {
    const bytes = archive();
    bytes[30] = 'X'.charCodeAt(0);
    expect(() => readArchive(bytes)).toThrow('local headers');
  });

  it('accepts BOM-prefixed JSON and rejects invalid UTF-8 before parsing', async () => {
    const data = await importBytes(strToU8('\uFEFF[]'), 'bom.json');
    expect(data.conversations).toEqual([]);
    await expect(importBytes(new Uint8Array([0xff, 0xfe, 0x7b]), 'invalid.json')).rejects.toThrow();
  });

  it('imports all supported segment naming variants in natural filename order', async () => {
    const bytes = zipSync({
      'conversations10.json': strToU8(JSON.stringify([conversation('ten')])),
      'conversations2.json': strToU8(JSON.stringify([conversation('two')])),
      'conversations_1.json': strToU8(JSON.stringify([conversation('one')])),
      'not-conversations.json': strToU8('malformed ignored file'),
    });
    const data = await importBytes(bytes, 'segments.zip');
    expect(new Set(data.conversations.map((chat) => chat.id))).toEqual(
      new Set(['one', 'two', 'ten']),
    );
    expect(data.conversations.findIndex((chat) => chat.id === 'two')).toBeLessThan(
      data.conversations.findIndex((chat) => chat.id === 'ten'),
    );
  });
});
