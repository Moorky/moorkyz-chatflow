import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { normalizeExport } from '../../src/importer/normalize';
import { csvCell, escapeHtml, exportBundle } from '../../src/exports/export';
import { sha256 } from '../../src/shared/integrity';
import { statistics, wordCount } from '../../src/analytics/statistics';
import { selectIds } from '../../src/selection/selection';
import type { ExportFormat } from '../../src/shared/model';
import { conversation } from '../fixtures/synthetic';

describe('safe portable exports', () => {
  it.each(['=SUM(A1)', '+cmd', '-123', '@formula', '  =1', '\tformula', '\n=1'])(
    'neutralizes spreadsheet formulas: %s',
    (value) => {
      expect(csvCell(value)).toMatch(/^"'/);
    },
  );
  it('quotes CSV without changing the source and escapes executable HTML', () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(escapeHtml('<script>"&</script>')).toBe('&lt;script&gt;&quot;&amp;&lt;/script&gt;');
  });

  it.each<ExportFormat>(['json', 'txt', 'csv', 'html'])(
    'exports all 3,000 messages in %s with verifiable manifest',
    async (format) => {
      const texts = Array.from({ length: 3000 }, (_, i) => `unique_message_${i}_end \u{1f680}`);
      const dataset = normalizeExport([[conversation('long', texts)]], 'source', 'synthetic.json');
      const bundle = await exportBundle(
        dataset,
        new Set(['long']),
        'active-path',
        format,
        'conversations',
        null,
      );
      const files = unzipSync(bundle.bytes);
      const report = files[`conversations.${format}`]!;
      const manifest = JSON.parse(strFromU8(files['manifest.json']!));
      expect(manifest.counts.exportedMessages).toBe(3000);
      expect(manifest.counts.selectedChats).toBe(manifest.counts.exportedChats);
      expect(manifest.files[0].sha256).toBe(await sha256(report));
      const decoded = strFromU8(report);
      for (const text of texts) expect(decoded).toContain(text);
      if (format === 'json')
        expect(JSON.parse(strFromU8(report)).conversations[0].messages).toHaveLength(3000);
    },
  );

  it('preserves all 25,000 messages in machine-readable export', async () => {
    const dataset = normalizeExport(
      [
        [
          conversation(
            'stress',
            Array.from({ length: 25000 }, (_, i) => `message ${i}`),
          ),
        ],
      ],
      'source',
      'synthetic.json',
    );
    const bundle = await exportBundle(
      dataset,
      new Set(['stress']),
      'active-path',
      'json',
      'conversations',
      null,
    );
    const files = unzipSync(bundle.bytes);
    const parsed = JSON.parse(strFromU8(files['conversations.json']!));
    expect(parsed.conversations[0].messages).toHaveLength(25000);
    expect(parsed.conversations[0].messages.at(-1).text).toBe('message 24999');
  });

  it('escapes hostile titles and messages in HTML without modifying JSON originals', async () => {
    const hostile = '<img src=x onerror=alert(1)><script>bad()</script>';
    const dataset = normalizeExport(
      [[conversation('hostile', [hostile], hostile)]],
      'source',
      'synthetic.json',
    );
    const bundle = await exportBundle(
      dataset,
      new Set(['hostile']),
      'active-path',
      'html',
      'conversations',
      null,
    );
    const html = strFromU8(unzipSync(bundle.bytes)['conversations.html']!);
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(dataset.conversations[0]?.messages[0]?.text).toBe(hostile);
  });

  it.each<ExportFormat>(['csv', 'html', 'json'])(
    'includes all 1,000 selected sources in %s statistics, even empty chats',
    async (format) => {
      const chats = Array.from({ length: 1000 }, (_, i) =>
        conversation(`source-${i}-end`, i % 2 ? [] : ['one two']),
      );
      const dataset = normalizeExport([chats], 'source', 'synthetic.json');
      const ids = new Set(dataset.conversations.map((c) => c.id));
      const bundle = await exportBundle(dataset, ids, 'active-path', format, 'statistics', null);
      const report = strFromU8(unzipSync(bundle.bytes)[`statistics.${format}`]!);
      for (const id of ids) expect(report).toContain(id);
      expect(statistics(dataset.conversations, 'active-path').sources).toHaveLength(1000);
    },
  );

  it('writes statistics CSV aggregate and source rows with the same columns as the header', async () => {
    const dataset = normalizeExport(
      [[conversation('csv-shape', ['one two'])]],
      'source',
      'synthetic.json',
    );
    const bundle = await exportBundle(
      dataset,
      new Set(['csv-shape']),
      'active-path',
      'csv',
      'statistics',
      null,
    );
    const report = strFromU8(unzipSync(bundle.bytes)['statistics.csv']!);
    const rows = report
      .trimEnd()
      .split('\r\n')
      .map((row) => row.split(','));
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveLength(20);
    for (const row of rows.slice(1)) expect(row).toHaveLength(rows[0]!.length);
    expect(rows[1]![9]).toBe('"2"');
    expect(rows[1]![10]).toBe('"2"');
  });

  it('rejects unknown and empty selections', async () => {
    const dataset = normalizeExport([[conversation()]], 'hash', 'x');
    await expect(
      exportBundle(dataset, new Set(), 'active-path', 'json', 'conversations', null),
    ).rejects.toThrow('Select');
    await expect(
      exportBundle(
        dataset,
        new Set(['chat-1', 'missing']),
        'active-path',
        'json',
        'conversations',
        null,
      ),
    ).rejects.toThrow('absent');
  });
});

describe('statistics and selection', () => {
  it('distinguishes weighted mean from mean of chat means, with complete sources', () => {
    const dataset = normalizeExport(
      [
        [
          conversation('small', ['one two']),
          conversation('large', ['one two three four', 'one two three four', 'one two three four']),
          conversation('empty', []),
        ],
      ],
      'hash',
      'x',
    );
    const report = statistics(dataset.conversations, 'active-path');
    expect(report.messages).toBe(4);
    expect(report.words).toBe(14);
    expect(report.weightedMeanWords).toBe(3.5);
    expect(report.meanOfChatMeans).toBe(3);
    expect(report.sources[2]?.meanWords).toBeNull();
    expect(wordCount('\u4e2d\u6587 \u{1f680} hello')).toBeGreaterThan(1);
  });
  it('deduplicates first/last N and never treats invalid counts as a successful selection', () => {
    const current = new Set(['old']);
    expect([...selectIds(current, ['a', 'b', 'a', 'c'], 'first', 2)]).toEqual(['old', 'a', 'b']);
    expect([...selectIds(current, ['a', 'b', 'c'], 'last', 2)]).toEqual(['old', 'b', 'c']);
    expect([...selectIds(current, ['a', 'a'], 'all')]).toEqual(['old', 'a']);
    for (const count of [NaN, 0, -1, 1.5, Infinity])
      expect(() => selectIds(current, ['a'], 'first', count)).toThrow();
  });
});
