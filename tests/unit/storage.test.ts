import { expect, it } from 'vitest';
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
