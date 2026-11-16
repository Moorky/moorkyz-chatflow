import { expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { reconstructMessages } from '../../exports/reconstruction';
import { normalizeExport } from '../../importer/normalize';
import { conversation } from '../fixtures/synthetic';

it('reconstructs in explicit selection order with exact text/provenance and unchanged sources', async () => {
  const data = normalizeExport(
    [[conversation('a', ['first', '<script>literal</script>']), conversation('b', ['other'])]],
    'source-hash',
    'synthetic',
  );
  const before = structuredClone(data);
  const files = unzipSync(
    await reconstructMessages(
      data,
      [
        { chatId: 'b', messageId: 'b-m0' },
        { chatId: 'a', messageId: 'a-m1' },
      ],
      'Context',
    ),
  );
  const document = JSON.parse(strFromU8(files['reconstruction.json']!));
  expect(document.segments.map((segment: { content: string }) => segment.content)).toEqual([
    'other',
    '<script>literal</script>',
  ]);
  expect(document.segments[1].provenance).toMatchObject({
    sourceExportId: 'source-hash',
    conversationId: 'a',
    messageId: 'a-m1',
    parentNodeId: 'n0',
  });
  const manifest = JSON.parse(strFromU8(files['manifest.json']!));
  expect(manifest.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(data).toEqual(before);
});

it('rejects empty, missing and duplicate message selections and empty titles', async () => {
  const data = normalizeExport([[conversation()]], 'h', 's');
  await expect(reconstructMessages(data, [], 'x')).rejects.toThrow('at least one');
  await expect(
    reconstructMessages(data, [{ chatId: 'chat-1', messageId: 'chat-1-m0' }], ' '),
  ).rejects.toThrow('title');
  await expect(
    reconstructMessages(data, [{ chatId: 'missing', messageId: 'm' }], 'x'),
  ).rejects.toThrow('no longer');
  await expect(
    reconstructMessages(data, [{ chatId: 'chat-1', messageId: 'missing' }], 'x'),
  ).rejects.toThrow('no longer');
  const reference = { chatId: 'chat-1', messageId: 'chat-1-m0' };
  await expect(reconstructMessages(data, [reference, reference], 'x')).rejects.toThrow('Duplicate');
});
