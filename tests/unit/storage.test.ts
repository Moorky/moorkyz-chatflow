import { describe, expect, it } from 'vitest';
import { normalizeExport } from '../../src/importer/normalize';
import { validDataset } from '../../src/storage/validate';
import { conversation } from '../fixtures/synthetic';

it('validates every restored record rather than trusting a schema version alone', () => {
  const dataset = normalizeExport([[conversation()]], 'a'.repeat(64), 'synthetic.json');
  expect(validDataset(dataset)).toBe(true);
  expect(validDataset({ schemaVersion: 1, conversations: [] })).toBe(false);
  expect(validDataset({ ...dataset, conversations: [null] })).toBe(false);
  expect(
    validDataset({
      ...dataset,
      conversations: [dataset.conversations[0], dataset.conversations[0]],
    }),
  ).toBe(false);
  const broken = structuredClone(dataset);
  broken.conversations[0]!.messages[0]!.timestamp = 'invalid';
  expect(validDataset(broken)).toBe(false);
  const wrongIdentity = structuredClone(dataset);
  wrongIdentity.conversations[0]!.originalUrl = 'https://chatgpt.com/c/another-chat';
  expect(validDataset(wrongIdentity)).toBe(false);
});

describe('persisted snapshot field validation', () => {
  const valid = () => normalizeExport([[conversation()]], 'a'.repeat(64), 'example.json');

  it.each([
    ['sourceExportId', 'invalid'],
    ['sourceName', null],
    ['schemaVersion', 2],
    ['importedAt', 'yesterday'],
    ['warnings', [42]],
    ['conversations', {}],
  ])('rejects invalid dataset field %s', (field, value) => {
    expect(validDataset(Object.assign(valid(), { [field]: value }))).toBe(false);
  });

  it.each([
    ['id', ''],
    ['title', null],
    ['originalId', 42],
    ['project', {}],
    ['createdAt', 'invalid'],
    ['updatedAt', 42],
    ['warnings', 'warning'],
    ['messages', null],
    ['originalUrl', 'javascript:alert(1)'],
  ])('rejects invalid conversation field %s', (field, value) => {
    const snapshot = valid();
    Object.assign(snapshot.conversations[0]!, { [field]: value });
    expect(validDataset(snapshot)).toBe(false);
  });

  it.each([
    ['id', ''],
    ['nodeId', 42],
    ['conversationId', 'wrong-chat'],
    ['parentId', {}],
    ['role', 'administrator'],
    ['role', ['user']],
    ['contentKind', ['text']],
    ['timestamp', '2026-10-29'],
    ['text', {}],
    ['attachmentRefs', [42]],
    ['active', 'true'],
  ])('rejects invalid message field %s = %j', (field, value) => {
    const snapshot = valid();
    Object.assign(snapshot.conversations[0]!.messages[0]!, { [field]: value });
    expect(validDataset(snapshot)).toBe(false);
  });

  it('rejects duplicate message IDs and accepts a matching verified source URL', () => {
    const snapshot = valid();
    snapshot.conversations[0]!.originalUrl = 'https://chatgpt.com/c/chat-1';
    expect(validDataset(snapshot)).toBe(true);
    snapshot.conversations[0]!.messages[1]!.id = snapshot.conversations[0]!.messages[0]!.id;
    expect(validDataset(snapshot)).toBe(false);
  });
});
