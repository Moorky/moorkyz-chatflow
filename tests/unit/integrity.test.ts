import { describe, expect, it } from 'vitest';
import { sha256, verifiedChatUrl } from '../../src/shared/integrity';
import { errorMessage } from '../../src/shared/model';

describe('source integrity and URL validation', () => {
  it('matches standard SHA-256 vectors, including exact typed-array view boundaries', async () => {
    expect(await sha256(new Uint8Array())).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    const bytes = new TextEncoder().encode('XabcY');
    expect(await sha256(bytes.subarray(1, 4))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it.each([
    undefined,
    null,
    42,
    {},
    '',
    'not a URL',
    'http://chatgpt.com/c/abc',
    'https://chatgpt.com:444/c/abc',
    'https://chatgpt.com/c/abc/extra',
    'https://chatgpt.com/c/abc/',
    'https://chatgpt.com/c/a%2Fb',
    'https://chatgpt.com/c/abc?x=1',
    'https://chatgpt.com/c/abc#message',
    'https://user@chatgpt.com/c/abc',
    'https://chatgpt.com.evil.example/c/abc',
    'https://evil.example/c/abc',
  ])('does not enable invalid source URL %j', (value) => {
    expect(verifiedChatUrl(value)).toBeNull();
  });

  it('retains a valid source-supplied link without making a network request', () => {
    expect(verifiedChatUrl('https://chatgpt.com/c/abc_123-DEF')).toBe(
      'https://chatgpt.com/c/abc_123-DEF',
    );
  });

  it.each([new Error('disk full'), 'plain error', null, 42])(
    'surfaces errors explicitly: %j',
    (value) => {
      expect(errorMessage(value)).toBe(value instanceof Error ? value.message : String(value));
    },
  );
});
