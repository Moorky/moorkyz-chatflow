export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function verifiedChatUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (
      url.origin === 'https://chatgpt.com' &&
      !url.username &&
      !url.password &&
      /^\/c\/[a-zA-Z0-9_-]+$/.test(url.pathname) &&
      !url.search &&
      !url.hash
    ) {
      return url.href;
    }
  } catch {
    // Invalid source URLs remain unavailable; never fabricate a link from an ID.
  }
  return null;
}
