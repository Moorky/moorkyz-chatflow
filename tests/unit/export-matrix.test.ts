import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { normalizeExport } from '../../src/importer/normalize';
import { csvCell, exportBundle } from '../../src/exports/export';
import type { BranchPolicy, ExportFormat } from '../../src/shared/model';
import { branchConversation, conversation } from '../fixtures/synthetic';
import { searchDefaults } from '../fixtures/options';

const matrix = (['conversations', 'statistics'] as const).flatMap((kind) =>
  (['active-path', 'all-branches'] as BranchPolicy[]).flatMap((branching) =>
    (['json', 'csv', 'html', 'txt'] as ExportFormat[]).map((format) => ({
      kind,
      branching,
      format,
    })),
  ),
);

describe('CSV conversation export columns', () => {
  it('keeps content kind and coverage warnings in separately labelled columns', async () => {
    const source = normalizeExport(
      [[conversation('csv-chat', ['alpha'])]],
      'c'.repeat(64),
      'x.json',
    );
    source.conversations[0]!.warnings = ['synthetic warning'];
    const bundle = await exportBundle(
      source,
      new Set(['csv-chat']),
      'active-path',
      'csv',
      'conversations',
      null,
    );
    const lines = strFromU8(unzipSync(bundle.bytes)['conversations.csv']!).trim().split(/\r?\n/);
    const header = lines[0]!.split(',');
    expect(header.slice(-2)).toEqual(['"content_kind"', '"coverage_warnings"']);
    expect(lines[1]!.endsWith(',"","synthetic warning"')).toBe(true);
    expect(lines[2]!.endsWith(',"text",""')).toBe(true);
  });
});

describe('format, report kind and branch policy matrix', () => {
  it.each(matrix)(
    '$kind / $branching / $format preserves selection, counts and hashes',
    async ({ kind, branching, format }) => {
      const source = normalizeExport(
        [[branchConversation(), conversation('excluded', ['must not export'])]],
        'b'.repeat(64),
        'example.json',
      );
      const before = structuredClone(source);
      const filter = { ...searchDefaults, query: 'question' };
      const bundle = await exportBundle(
        source,
        new Set(['branched']),
        branching,
        format,
        kind,
        filter,
      );
      const files = unzipSync(bundle.bytes);
      expect(Object.keys(files).sort()).toEqual(
        ['README.txt', `${kind}.${format}`, 'manifest.json'].sort(),
      );
      const body = files[`${kind}.${format}`]!;
      const decoded = strFromU8(body);
      expect(decoded).toContain('branched');
      expect(decoded).not.toContain('must not export');
      const manifest = JSON.parse(strFromU8(files['manifest.json']!));
      expect(manifest.counts).toEqual({
        importedChats: 2,
        selectedChats: 1,
        exportedChats: 1,
        exportedMessages: branching === 'active-path' ? 2 : 3,
        errors: 0,
      });
      expect(manifest.files[0]).toMatchObject({
        size: body.length,
        sha256: createHash('sha256').update(body).digest('hex'),
      });
      expect(manifest.selection.chatIds).toEqual(['branched']);
      expect(manifest.selection.queryFingerprint).toBe(
        createHash('sha256').update(JSON.stringify(filter)).digest('hex'),
      );
      expect(manifest.sourceFingerprint).toBe('b'.repeat(64));
      if (kind === 'conversations') {
        expect(decoded.includes('discarded answer')).toBe(branching === 'all-branches');
        expect(decoded).toContain('chosen answer');
      }
      if (format === 'html') {
        expect(decoded).toContain("default-src 'none'");
        expect(decoded).toContain('Original URL not supplied');
        expect(decoded).not.toMatch(/<script|<iframe|<img/i);
      }
      expect(source).toEqual(before);
    },
  );

  it('retains a source-supplied link and escapes hostile source titles in statistics HTML', async () => {
    const source = normalizeExport(
      [
        [
          {
            ...conversation('source-link', ['hello'], '<script>title()</script>'),
            url: 'https://chatgpt.com/c/source-link',
          },
        ],
      ],
      'a'.repeat(64),
      'example.json',
    );
    const bundle = await exportBundle(
      source,
      new Set(['source-link']),
      'active-path',
      'html',
      'statistics',
      null,
    );
    const report = strFromU8(unzipSync(bundle.bytes)['statistics.html']!);
    expect(report).toContain('href="https://chatgpt.com/c/source-link"');
    expect(report).toContain('&lt;script&gt;title()&lt;/script&gt;');
    expect(report).not.toContain('<script>');
  });

  it.each([null, undefined, '', 'plain', '12', '\u{1f680}'])(
    'does not formula-prefix ordinary CSV value %j',
    (value) => {
      expect(csvCell(value)).toBe(`"${value ?? ''}"`);
    },
  );
});
