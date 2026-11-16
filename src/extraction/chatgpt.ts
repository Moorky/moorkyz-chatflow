export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      'Unsupported ChatGPT response: expected an object. Stop and report the schema change.',
    );
  }
  return value as Record<string, unknown>;
}

export function identifier(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,160}$/.test(value) ||
    ['__proto__', 'constructor', 'prototype'].includes(value)
  ) {
    throw new Error('Invalid conversation/project identifier.');
  }
  return value;
}

export function conversationId(value: string): string {
  if (!value.includes('://')) return identifier(value.trim());
  const url = new URL(value);
  const match = /^\/(?:c|g\/[^/]+\/c)\/([a-zA-Z0-9_-]+)\/?$/.exec(url.pathname);
  if (url.origin !== 'https://chatgpt.com' || url.username || url.password || !match) {
    throw new Error('Enter a chatgpt.com conversation URL or its conversation ID.');
  }
  return identifier(match[1]);
}

export class AccessError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface InventoryItem {
  id: string;
  title: string;
  updatedAt: string | null;
  projectId: string | null;
  archived: boolean;
}

export interface ConversationAdapter {
  readonly accountKey: string;
  page(
    offset: number,
    archived: boolean,
    signal: AbortSignal,
  ): Promise<{ items: InventoryItem[]; total: number }>;
  conversation(id: string, signal: AbortSignal): Promise<Record<string, unknown>>;
}

export async function connectChatGPT(
  fetcher: typeof fetch,
  workspaceId: string,
  signal: AbortSignal,
): Promise<ConversationAdapter> {
  if (workspaceId) identifier(workspaceId);
  // The token stays inside this closure: never log, export or persist it.
  const sessionResponse = await fetcher('https://chatgpt.com/api/auth/session', {
    credentials: 'same-origin',
    redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
  });
  if (!sessionResponse.ok)
    throw new AccessError(
      'Sign in to ChatGPT, then retry. No session was saved.',
      sessionResponse.status,
    );
  const session = object(await sessionResponse.json());
  const user = object(session.user);
  if (
    typeof session.accessToken !== 'string' ||
    !session.accessToken ||
    typeof user.id !== 'string' ||
    !user.id
  ) {
    throw new AccessError(
      'No supported authenticated ChatGPT session found. Sign in or report a session schema change.',
      401,
    );
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${session.accessToken}` };
  if (workspaceId) headers['ChatGPT-Account-ID'] = workspaceId;
  const accountBytes = new TextEncoder().encode(`${user.id}\0${workspaceId}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', accountBytes));
  const accountKey = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  async function get(path: string, signal: AbortSignal) {
    const response = await fetcher(`https://chatgpt.com/backend-api/${path}`, {
      headers,
      credentials: 'same-origin',
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        throw new AccessError(
          'Authentication expired or access was refused. Sign in/check the workspace; resume manually.',
          response.status,
        );
      if (response.status === 429)
        throw new AccessError(
          `ChatGPT rate limit reached. Pause and retry later${response.headers.get('Retry-After') ? ' (respect the service Retry-After interval)' : ''}.`,
          429,
        );
      throw new AccessError(`ChatGPT request failed (HTTP ${response.status}).`, response.status);
    }
    return object(await response.json());
  }
  return {
    accountKey,
    async page(offset, archived, signal) {
      const data = await get(
        `conversations?offset=${offset}&limit=100&order=updated${archived ? '&is_archived=true' : ''}`,
        signal,
      );
      if (
        !Array.isArray(data.items) ||
        !Number.isSafeInteger(data.total) ||
        Number(data.total) < 0
      ) {
        throw new Error(
          'Unsupported conversation inventory. Discovery stopped rather than claiming a complete account.',
        );
      }
      return {
        total: Number(data.total),
        items: data.items.map((value) => {
          const item = object(value);
          if (typeof item.title !== 'string')
            throw new Error('Inventory title unavailable; response schema changed.');
          return {
            id: identifier(item.id),
            title: item.title,
            updatedAt:
              typeof item.update_time === 'string' || typeof item.update_time === 'number'
                ? String(item.update_time)
                : null,
            projectId: typeof item.gizmo_id === 'string' ? identifier(item.gizmo_id) : null,
            archived,
          };
        }),
      };
    },
    async conversation(id, signal) {
      const raw = await get(`conversation/${identifier(id)}`, signal);
      if ((raw.conversation_id ?? raw.id) !== id)
        throw new Error('Conversation identity mismatch; response not saved.');
      return { ...raw, id, url: `https://chatgpt.com/c/${id}` };
    },
  };
}
