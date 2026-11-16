export function downloadBytes(bytes: Uint8Array, filename: string, type = 'application/zip') {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
