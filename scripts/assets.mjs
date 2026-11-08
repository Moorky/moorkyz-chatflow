import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

await mkdir('public/icons', { recursive: true });
const dependency = JSON.parse(
  await readFile(join('node_modules', 'fflate', 'package.json'), 'utf8'),
);
const license = await readFile(join('node_modules', 'fflate', 'LICENSE'), 'utf8');
await writeFile(
  join('public', 'THIRD_PARTY_NOTICES.txt'),
  `MOORKYZ ChatFlow - bundled third-party software\n\nfflate ${dependency.version}\n\n${license}`,
);
for (const file of ['LICENSE', 'NOTICE']) {
  await writeFile(join('public', file), await readFile(file));
}
for (const size of [16, 32, 48, 128]) {
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = y * (size * 4 + 1) + 1 + x * 4;
      const nx = x / size;
      const ny = y / size;
      const bubble = nx > 0.18 && nx < 0.82 && ny > 0.22 && ny < 0.67;
      const tail = nx > 0.25 && nx < 0.43 && ny >= 0.67 && ny < 0.83 - (nx - 0.25);
      const line = nx > 0.3 && nx < 0.7 && ((ny > 0.35 && ny < 0.4) || (ny > 0.49 && ny < 0.54));
      const white = (bubble || tail) && !line;
      rows.set(white ? [255, 255, 255, 255] : [87, 80, 189, 255], offset);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  await writeFile(
    `public/icons/${size}.png`,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(rows)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}
