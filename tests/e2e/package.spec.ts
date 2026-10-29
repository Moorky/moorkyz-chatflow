import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';

test('release ZIP matches its checksum, manifest version, assets, CSP and complete dependency notice', async () => {
  const pkg = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
  const filename = `moorkyz-chatflow-${pkg.version}.zip`;
  const bytes = await readFile(resolve('artifacts', filename));
  const checksum = await readFile(resolve('artifacts', `${filename}.sha256`), 'utf8');
  expect(checksum.trim()).toBe(`${createHash('sha256').update(bytes).digest('hex')}  ${filename}`);
  const files = unzipSync(new Uint8Array(bytes));
  const manifest = JSON.parse(strFromU8(files['manifest.json']!));
  expect(manifest.version).toBe(pkg.version);
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions ?? []).toEqual([]);
  expect(manifest.host_permissions ?? []).toEqual([]);
  expect(manifest.content_security_policy.extension_pages).toContain("connect-src 'none'");
  expect(manifest.content_security_policy.extension_pages).not.toContain('unsafe-eval');
  expect(files[manifest.background.service_worker]).toBeDefined();
  for (const path of Object.values(manifest.icons)) {
    if (typeof path !== 'string') throw new Error('Manifest icon path must be a string.');
    expect([...files[path]!.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  }
  const html = strFromU8(files['index.html']!);
  for (const match of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) {
    expect(files[match[1]!]).toBeDefined();
  }
  const license = await readFile(resolve('node_modules', 'fflate', 'LICENSE'), 'utf8');
  expect(strFromU8(files['THIRD_PARTY_NOTICES.txt']!)).toContain(license.trim());
});
