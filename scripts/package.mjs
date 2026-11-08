import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';

const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
if (manifest.manifest_version !== 3 || manifest.permissions || manifest.host_permissions) {
  throw new Error('Offline package must be Manifest V3 with no account/host permissions.');
}
for (const entry of [
  'index.html',
  'THIRD_PARTY_NOTICES.txt',
  'LICENSE',
  'NOTICE',
  manifest.background.service_worker,
  ...Object.values(manifest.icons),
]) {
  await readFile(join('dist', entry));
}
for (const file of ['LICENSE', 'NOTICE']) {
  if (!(await readFile(join('dist', file))).equals(await readFile(file))) {
    throw new Error(`The packaged ${file} must match the repository ${file}.`);
  }
}
const license = await readFile(join('node_modules', 'fflate', 'LICENSE'), 'utf8');
const notices = await readFile(join('dist', 'THIRD_PARTY_NOTICES.txt'), 'utf8');
if (!notices.includes(license.trim())) {
  throw new Error('The bundled dependency license must be retained in the extension package.');
}
const files = {};
async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else files[relative('dist', path).replaceAll('\\', '/')] = new Uint8Array(await readFile(path));
  }
}
await collect('dist');
const archive = zipSync(files, { level: 9, mtime: new Date(1980, 0, 1) });
await mkdir('artifacts', { recursive: true });
const filename = `moorkyz-chatflow-${manifest.version}.zip`;
await writeFile(join('artifacts', filename), archive);
const digest = createHash('sha256').update(archive).digest('hex');
await writeFile(join('artifacts', `${filename}.sha256`), `${digest}  ${filename}\n`);
console.log(
  `MV3 package verified: ${filename} (${archive.length} bytes, ${Object.keys(files).length} files)`,
);
console.log(`SHA-256: ${digest}`);
