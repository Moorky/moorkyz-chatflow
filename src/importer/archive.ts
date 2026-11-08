import { strFromU8, Unzip, UnzipInflate } from 'fflate';
import { sha256 } from '../shared/integrity';
import { normalizeExport } from './normalize';
import type { Dataset } from '../shared/model';

export const IMPORT_LIMITS = {
  inputBytes: 128 * 1024 * 1024,
  expandedBytes: 256 * 1024 * 1024,
  entries: 10_000,
};

function safePath(path: string): boolean {
  return (
    !path.startsWith('/') &&
    !path.includes('\\') &&
    !/^[a-zA-Z]:/.test(path) &&
    !path.split('/').some((part) => part === '..' || part === '.') &&
    !path.includes('\0')
  );
}

interface ArchiveEntry {
  crc: number;
  size: number;
  selected: boolean;
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  return crc >>> 0;
});

function directory(bytes: Uint8Array): Map<string, ArchiveEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  const minimum = Math.max(0, bytes.length - 65557);
  while (end >= minimum) {
    if (
      view.getUint32(end, true) === 0x06054b50 &&
      end + 22 + view.getUint16(end + 20, true) === bytes.length
    )
      break;
    end--;
  }
  if (end < minimum) {
    throw new Error('Invalid or truncated ZIP end-of-directory.');
  }
  const count = view.getUint16(end + 10, true);
  const size = view.getUint32(end + 12, true);
  const offset = view.getUint32(end + 16, true);
  if (
    view.getUint16(end + 4, true) !== 0 ||
    view.getUint16(end + 6, true) !== 0 ||
    view.getUint16(end + 8, true) !== count ||
    count === 0xffff ||
    offset === 0xffffffff ||
    size === 0xffffffff
  ) {
    throw new Error('Multi-disk and ZIP64 archives are not supported by this importer.');
  }
  if (count > IMPORT_LIMITS.entries) throw new Error('ZIP entry-count safety limit exceeded.');
  if (offset + size !== end) throw new Error('Invalid ZIP directory bounds.');
  const entries = new Map<string, ArchiveEntry>();
  let cursor = offset;
  let expanded = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error('Invalid ZIP directory entry.');
    }
    const flags = view.getUint16(cursor + 8, true);
    if (flags & 1) throw new Error('Encrypted ZIP entries are not supported.');
    const nameSize = view.getUint16(cursor + 28, true);
    const entrySize =
      46 + nameSize + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
    if (cursor + entrySize > end) throw new Error('Truncated ZIP directory entry.');
    const name = strFromU8(bytes.subarray(cursor + 46, cursor + 46 + nameSize), !(flags & 2048));
    if (!safePath(name)) throw new Error('Unsafe path in ZIP; import stopped.');
    if (entries.has(name)) throw new Error(`Duplicate ZIP entry: ${name}.`);
    const selected = /(^|\/)conversations(?:[-_]?\d+)?\.json$/i.test(name);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    if (selected) expanded += uncompressedSize;
    if (expanded > IMPORT_LIMITS.expandedBytes)
      throw new Error('ZIP expansion safety limit exceeded.');
    entries.set(name, { crc: view.getUint32(cursor + 16, true), size: uncompressedSize, selected });
    cursor += entrySize;
  }
  if (cursor !== end) throw new Error('ZIP directory size does not match its entries.');
  return entries;
}

export function readArchive(bytes: Uint8Array): string[] {
  const expected = directory(bytes);
  const segments = new Map<string, string>();
  const pending = new Set<string>();
  const seen = new Set<string>();
  let expanded = 0;
  let entries = 0;
  const unzip = new Unzip((file) => {
    if (++entries > IMPORT_LIMITS.entries)
      throw new Error('ZIP entry-count safety limit exceeded.');
    if (!safePath(file.name)) throw new Error('Unsafe path in ZIP; import stopped.');
    if (seen.has(file.name)) throw new Error(`Duplicate ZIP entry: ${file.name}.`);
    seen.add(file.name);
    const entry = expected.get(file.name);
    if (!entry) throw new Error('ZIP local headers do not match the directory.');
    if (!entry.selected) return;
    if (file.originalSize && file.originalSize > IMPORT_LIMITS.expandedBytes) {
      throw new Error('ZIP expansion safety limit exceeded.');
    }
    pending.add(file.name);
    const chunks: string[] = [];
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let crc = 0xffffffff;
    let fileSize = 0;
    file.ondata = (error, chunk, final) => {
      if (error)
        throw new Error(`Cannot decompress ${file.name}: ${error.message}`, { cause: error });
      expanded += chunk.length;
      fileSize += chunk.length;
      if (expanded > IMPORT_LIMITS.expandedBytes) {
        file.terminate();
        throw new Error('ZIP expansion safety limit exceeded.');
      }
      for (const byte of chunk) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255]!;
      chunks.push(decodeUtf8(decoder, chunk, file.name, !final));
      if (final) {
        if ((crc ^ 0xffffffff) >>> 0 !== entry.crc || fileSize !== entry.size) {
          throw new Error(`ZIP integrity check failed for ${file.name}.`);
        }
        segments.set(file.name, chunks.join(''));
        pending.delete(file.name);
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  // Bounded input chunks allow decompression limits to interrupt highly compressed archives.
  for (let offset = 0; offset < bytes.length; offset += 64 * 1024) {
    unzip.push(bytes.subarray(offset, offset + 64 * 1024), offset + 64 * 1024 >= bytes.length);
  }
  if (pending.size) throw new Error('Incomplete ZIP conversation data.');
  if (seen.size !== expected.size)
    throw new Error('ZIP directory and extracted entries do not match.');
  if (!segments.size)
    throw new Error('No conversations.json or numbered conversation segments found.');
  return [...segments.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
    .map(([, value]) => value);
}

function decodeUtf8(
  decoder: TextDecoder,
  bytes: Uint8Array,
  label: string,
  stream = false,
): string {
  try {
    return decoder.decode(bytes, { stream });
  } catch (error) {
    throw new Error(
      `${label} is not valid UTF-8 text. Use the unmodified official export file; no data was replaced.`,
      { cause: error },
    );
  }
}

export async function importBytes(
  bytes: Uint8Array,
  name: string,
  progress: (message: string) => void = () => {},
): Promise<Dataset> {
  if (bytes.length > IMPORT_LIMITS.inputBytes) {
    throw new Error('Import exceeds the 128 MiB input safety budget; no data was replaced.');
  }
  if (!bytes.length) throw new Error('The import file is empty.');
  progress('Checking source fingerprint and archive...');
  const sourceExportId = await sha256(bytes);
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const json = zip
    ? readArchive(bytes)
    : [decodeUtf8(new TextDecoder('utf-8', { fatal: true }), bytes, 'The JSON file')];
  progress(`Normalizing ${json.length} conversation segment(s)...`);
  const segments: unknown[] = json.map((value, i) => {
    try {
      return JSON.parse(value.replace(/^\uFEFF/, '')) as unknown;
    } catch (error) {
      throw new Error(`Invalid JSON in segment ${i + 1}: ${String(error)}`, { cause: error });
    }
  });
  return normalizeExport(segments, sourceExportId, name);
}
