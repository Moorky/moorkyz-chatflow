import './styles.css';
import type { Statistics } from '../analytics/statistics';
import { escapeHtml } from '../exports/export';
import { branchMessages, errorMessage } from '../shared/model';
import type {
  BranchPolicy,
  Conversation,
  Dataset,
  ExportFormat,
  Hit,
  SearchOptions,
  SearchResult,
  WorkerRequest,
  WorkerResponse,
} from '../shared/model';
import { selectIds } from '../selection/selection';
import { demoExport, demoFileName, isDemoDataset } from './demo';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="#"><span class="brand-icon" aria-hidden="true">CF</span><span>MOORKYZ <strong>ChatFlow <span class="version">${__APP_VERSION__}</span></strong></span></a>
    <p class="eyebrow sidebar-label">YOUR WORKSPACE</p>
    <a class="nav-link active" href="#library"><span aria-hidden="true">&#9638;</span> Conversation library</a>
    <div class="sidebar-card"><span class="status-dot"></span><strong>Offline, by design.</strong><p>Your conversations stay on this device, stored unencrypted in this browser profile until you clear them. No account connection. No tracking. No subscriptions.</p></div>
    <div class="sidebar-bottom"><button id="forget" class="quiet danger" disabled>Clear local data</button><button id="privacy" class="quiet">Privacy &amp; limitations</button><p>Independent of OpenAI.<br>Free. Local. Yours.</p></div>
  </aside>
  <main id="library">
    <header class="topbar"><span class="breadcrumb">Workspace <span>/</span> Conversation library</span><span class="badge"><span class="status-dot"></span> LOCAL ONLY</span></header>
    <div class="content">
      <section class="page-heading"><div><p class="eyebrow">A LITTLE ORDER. A LOT OF POSSIBILITY.</p><h1>Your conversations,<br><span>rediscovered.</span></h1><p class="subtitle">Find the thought. Follow the context. Keep the whole story.</p></div><div class="import-action"><button id="import-button" class="button primary" aria-describedby="import-hint">+ Import ChatGPT export</button><p id="import-hint" class="import-hint">ZIP or JSON &middot; processed on this device</p></div><input id="import-file" type="file" accept=".json,.zip,application/json,application/zip" hidden></section>
      <section id="welcome" class="welcome"><div class="welcome-icon" aria-hidden="true">&#8615;</div><div><h2>Start with your official ChatGPT export</h2><p>Import the export ZIP, its <code>conversations.json</code>, or a JSON array of conversations. Everything is processed locally, right here.</p><details class="export-guide"><summary>How to get your export</summary><ol><li>In ChatGPT, open <strong>Settings &rarr; Data controls &rarr; Export data</strong> and confirm (menu names can change).</li><li>Download the ZIP from the link OpenAI sends you by email.</li><li>Choose <strong>Import ChatGPT export</strong> and select that ZIP. Keep the original; ChatFlow never modifies it.</li></ol><p>Limits: 128 MiB per file, 256 MiB of expanded conversation JSON, 10,000 ZIP entries. Only exported text is indexed; images, files and audio are listed as references, not imported.</p></details><button id="demo" class="text-button">Explore with synthetic demo data <span aria-hidden="true">&#8594;</span></button></div><span class="pill">NO ACCOUNT REQUIRED</span></section>
      <div id="demo-banner" class="demo-banner" role="note" hidden><strong>Synthetic demo data.</strong> These conversations are fictional examples, not your ChatGPT history. Importing your own export replaces them.</div>
      <div id="status" class="notice" role="status" aria-live="polite">Ready for your first import.</div>
      <div id="error" class="error" role="alert" hidden></div>
      <section class="metrics" aria-label="Library counts">
        <div><span>Imported chats</span><strong id="chat-count">0</strong><small>In this local snapshot</small></div>
        <div><span>Indexed messages</span><strong id="message-count">0</strong><small>Under selected branch policy</small></div>
        <div><span>Matching chats / messages</span><strong id="hit-count">0 / 0</strong><small id="occurrence-count">0 text occurrences</small></div>
        <div><span>Selected chats</span><strong id="selected-count">0</strong><small>Your selection, your control</small></div>
      </section>
      <section class="search-panel" aria-label="Search conversations">
        <form id="search-form"><label class="sr-only" for="query">Search query</label><div class="search-line"><span aria-hidden="true" class="search-icon">&#9906;</span><input id="query" type="search" placeholder='Search a thought, a phrase, a possibility...' autocomplete="off" spellcheck="false"><button class="button primary" id="search-button" disabled>Search library</button></div>
        <div class="filter-row">
          <label>Match in <select id="scope"><option value="message">Same message</option><option value="conversation">Anywhere in chat</option></select></label>
          <label>Search <select id="fields"><option value="both">Title + messages</option><option value="text">Messages only</option><option value="title">Titles only</option></select></label>
          <label>Branches <select id="branching"><option value="active-path">Active path</option><option value="all-branches">All branches</option></select></label>
          <details class="advanced"><summary>More filters</summary><div class="advanced-fields">
            <label>Role <select id="role"><option value="all">All roles</option><option value="user">User</option><option value="assistant">Assistant</option><option value="system">System</option><option value="tool">Tool</option><option value="unknown">Unknown</option></select></label>
            <label>Message date from (UTC)<input id="date-from" type="date"></label><label>Through (UTC, inclusive)<input id="date-to" type="date"></label>
            <label class="check-label"><input id="case-sensitive" type="checkbox"> Case sensitive</label><label class="check-label"><input id="within-selection" type="checkbox"> Search only selected chats</label>
          </div></details>
          <label class="check-label discreet"><input id="discreet" type="checkbox"> Hide previews</label>
        </div></form>
        <details class="search-help"><summary>How search works</summary><div class="search-help-body">
          <p><strong>Syntax.</strong> <code>(search OR migration) AND NOT draft</code> &middot; <code>"exact phrase"</code> &middot; adjacent words mean AND &middot; precedence NOT &gt; AND &gt; OR. Literal text matching, not fuzzy or semantic.</p>
          <p><strong>Same message</strong> requires the whole query to match inside one message (or the title on its own). <strong>Anywhere in chat</strong> lets terms match different messages of one conversation; NOT then excludes the whole chat.</p>
          <p><strong>Active path</strong> searches the answers you kept in each chat. <strong>All branches</strong> also searches edited prompts and regenerated answers you moved away from; shared earlier messages count once.</p>
          <p><strong>Counts.</strong> Matching chats are conversations the query selects. Matching messages are the message hits listed for those chats: with Same message each one satisfies the whole query; with Anywhere in chat each one contains a searched term (chats included only through NOT are listed by query logic, without message hits). Text occurrences count literal matches of searched (non-NOT) terms inside those hits only, including a title hit when titles are searched.</p>
          <p>Role and date filters (under More filters) narrow candidate messages before matching. Dates are UTC message times, not chat creation dates.</p>
        </div></details>
      </section>
      <section class="library-panel" aria-labelledby="results-heading">
        <div class="results-toolbar"><div><h2 id="results-heading">Conversation library</h2><span id="results-summary">Your next good idea might already be here.</span></div><label>Sort <select id="sort"><option value="source">Source order</option><option value="newest">Newest created</option><option value="oldest">Oldest created</option><option value="title">Title A-Z</option></select></label></div>
        <div class="selection-toolbar"><button id="select-all" class="quiet" disabled>Select all results</button><label class="sr-only" for="select-count">Number of chats</label><input id="select-count" type="number" min="1" step="1" value="10"><button id="select-first" class="quiet" disabled>First N</button><button id="select-last" class="quiet" disabled>Last N</button><button id="clear-selection" class="quiet" disabled>Clear selection</button><span class="toolbar-spacer"></span><button id="stats" class="button small" disabled>Statistics</button><button id="export" class="button small primary" disabled>Export selection</button></div>
        <div id="results" class="results"><div class="empty-state"><span class="empty-mark" aria-hidden="true">&#9638;</span><h3>Room for all your ideas.</h3><p>Import your history to start connecting the dots.</p><p class="muted">Official exports only. No live scraping or account changes.</p></div></div>
        <button id="more-results" class="quiet more" hidden>Show more chats</button>
      </section>
      <footer><span id="coverage">Coverage: no local snapshot loaded.</span><span>Search &middot; Organize &middot; Analyze &middot; Export</span></footer>
    </div>
  </main>
  <dialog id="viewer" class="viewer-dialog" aria-labelledby="viewer-title"><div class="dialog-heading"><div><p class="eyebrow">LOCAL CONVERSATION VIEWER</p><h2 id="viewer-title"></h2></div><button class="button" id="close-viewer">Close</button></div><div id="viewer-meta"></div><div class="viewer-navigation"><button class="button" id="previous-hit">Previous match</button><span id="viewer-position" role="status"></span><button class="button" id="next-hit">Next match</button></div><div id="viewer-messages"></div><div class="viewer-navigation"><button class="quiet" id="previous-page">Previous messages</button><span id="viewer-page"></span><button class="quiet" id="next-page">Next messages</button></div></dialog>
  <dialog id="action-dialog" aria-labelledby="action-title"><div class="dialog-heading"><h2 id="action-title"></h2><button class="button" id="close-action">Close</button></div><div id="action-body"></div></dialog>
`;

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing UI element: ${id}`);
  return found as T;
}
const input = (id: string) => element<HTMLInputElement>(id);
const select = (id: string) => element<HTMLSelectElement>(id);
const button = (id: string) => element<HTMLButtonElement>(id);
const worker = new Worker(new URL('../background/worker.ts', import.meta.url), { type: 'module' });
const updates = new BroadcastChannel('moorkyz-chatflow-snapshot');
updates.addEventListener('message', () => location.reload());
let dataset: Dataset | null = null;
let result: SearchResult | null = null;
let selected = new Set<string>();
let nextId = 0;
let latestSearch = 0;
let busy = false;
let searching = false;
let storageProblem = false;
let shownChats = 40;
let lastOptions: SearchOptions | null = null;
const pending = new Map<
  number,
  { resolve: (value: WorkerResponse) => void; reject: (error: Error) => void }
>();

function announce(message: string) {
  element('status').textContent = message;
}
function showError(error: unknown) {
  element('error').textContent = errorMessage(error);
  element('error').hidden = false;
}
function clearError() {
  element('error').hidden = true;
}
type RequestPayload = WorkerRequest extends infer R
  ? R extends WorkerRequest
    ? Omit<R, 'id'>
    : never
  : never;
function request(payload: RequestPayload): Promise<WorkerResponse> {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ ...payload, id });
  });
}
worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
  const response = event.data;
  if (response.type === 'progress') return announce(response.message);
  const handler = pending.get(response.id);
  if (!handler) return;
  pending.delete(response.id);
  if (response.type === 'error') handler.reject(new Error(response.message));
  else handler.resolve(response);
});
worker.addEventListener('error', (event) => {
  const error = new Error(`Local worker failed: ${event.message}. Reload ChatFlow to retry.`);
  for (const handler of pending.values()) handler.reject(error);
  pending.clear();
  showError(error);
});

function branching(): BranchPolicy {
  return select('branching').value === 'all-branches' ? 'all-branches' : 'active-path';
}
function dateBoundary(id: string, nextDay: boolean): string | null {
  const value = input(id).value;
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) throw new Error('Enter a valid message date.');
  if (nextDay) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}
function searchOptions(): SearchOptions {
  const role = select('role').value;
  return {
    query: input('query').value,
    scope: select('scope').value === 'conversation' ? 'conversation' : 'message',
    fields:
      select('fields').value === 'text'
        ? 'text'
        : select('fields').value === 'title'
          ? 'title'
          : 'both',
    caseSensitive: input('case-sensitive').checked,
    branching: branching(),
    selectedIds: input('within-selection').checked ? [...selected] : null,
    role:
      role === 'user' ||
      role === 'assistant' ||
      role === 'system' ||
      role === 'tool' ||
      role === 'unknown'
        ? role
        : 'all',
    startInclusive: dateBoundary('date-from', false),
    endExclusive: dateBoundary('date-to', true),
  };
}
function orderedGroups() {
  const groups = [...(result?.groups ?? [])];
  const chats = new Map(dataset?.conversations.map((chat) => [chat.id, chat]) ?? []);
  const mode = select('sort').value;
  if (mode !== 'source') {
    groups.sort((a, b) => {
      const ca = chats.get(a.chatId)!;
      const cb = chats.get(b.chatId)!;
      if (mode === 'title') return ca.title.localeCompare(cb.title) || ca.id.localeCompare(cb.id);
      if (!ca.createdAt) return cb.createdAt ? 1 : ca.id.localeCompare(cb.id);
      if (!cb.createdAt) return -1;
      return (
        (mode === 'newest'
          ? cb.createdAt.localeCompare(ca.createdAt)
          : ca.createdAt.localeCompare(cb.createdAt)) || ca.id.localeCompare(cb.id)
      );
    });
  }
  return groups;
}

function updateControls() {
  const ready = Boolean(dataset) && !busy && !searching;
  element('results').inert = !ready;
  button('search-button').disabled = !ready;
  button('forget').disabled = busy || (!dataset && !storageProblem);
  button('import-button').disabled = busy;
  button('demo').disabled = busy;
  for (const control of element('search-form').querySelectorAll<
    HTMLInputElement | HTMLSelectElement
  >('input, select')) {
    control.disabled = busy;
  }
  for (const id of ['select-all', 'select-first', 'select-last']) {
    button(id).disabled = !ready || !result?.groups.length;
  }
  for (const id of ['stats', 'export', 'clear-selection']) {
    button(id).disabled = !ready || !selected.size;
  }
  element('selected-count').textContent = selected.size.toLocaleString();
  element('import-hint').textContent = dataset
    ? 'Replaces this local library only after the new file validates and saves.'
    : 'ZIP or JSON · processed on this device';
  element('demo-banner').hidden = !dataset || !isDemoDataset(dataset);
  for (const checkbox of element('results').querySelectorAll<HTMLInputElement>(
    'input[type=checkbox]',
  )) {
    checkbox.disabled = !ready;
  }
}

function snippet(text: string, hit: Hit): string {
  const first = hit.offsets[0]?.start ?? 0;
  const start = Math.max(0, first - 55);
  const end = Math.min(text.length, Math.max(first + 150, start + 220));
  let html = start ? '&hellip;' : '';
  let cursor = start;
  for (const offset of hit.offsets) {
    if (offset.end <= cursor || offset.start >= end) continue;
    const from = Math.max(cursor, offset.start);
    html += escapeHtml(text.slice(cursor, from));
    html += `<mark>${escapeHtml(text.slice(from, Math.min(end, offset.end)))}</mark>`;
    cursor = Math.min(end, offset.end);
  }
  html += escapeHtml(text.slice(cursor, end));
  return html + (end < text.length ? '&hellip;' : '');
}
function formatTime(value: string | null): string {
  return value ? `${value.slice(0, 10)} UTC` : 'Date unknown';
}
function warningCount(current: Dataset): number {
  return current.conversations.reduce((sum, chat) => sum + chat.warnings.length, 0);
}
// Dataset-derived counts must refresh even when the follow-up search fails.
function renderInventory() {
  if (!dataset) return;
  element('welcome').hidden = true;
  element('chat-count').textContent = dataset.conversations.length.toLocaleString();
  element('message-count').textContent = dataset.conversations
    .reduce((sum, chat) => sum + branchMessages(chat, branching()).length, 0)
    .toLocaleString();
  element('coverage').textContent =
    `Local snapshot: ${dataset.sourceName} | Imported ${formatTime(dataset.importedAt)} | ${warningCount(dataset)} integrity warnings | Live-account coverage unknown`;
  updateControls();
}
function renderResults() {
  updateControls();
  if (!dataset || !result) return;
  renderInventory();
  element('message-count').textContent = result.indexedMessages.toLocaleString();
  element('hit-count').textContent =
    `${result.groups.length.toLocaleString()} / ${result.messageCount.toLocaleString()}`;
  element('occurrence-count').textContent =
    `${result.occurrenceCount.toLocaleString()} text occurrences`;
  element('results-summary').textContent =
    `${result.groups.length} matching chats. ${selected.size} selected across the library.`;
  const warnings = warningCount(dataset);
  const container = element('results');
  container.replaceChildren();
  if (!result.groups.length) {
    const options = lastOptions;
    const filters = options
      ? [
          options.query.trim()
            ? `query “${options.query.trim().slice(0, 120)}${options.query.trim().length > 120 ? '…' : ''}”`
            : 'no query text',
          options.scope === 'conversation' ? 'anywhere in chat' : 'same message',
          options.fields === 'both'
            ? 'titles + messages'
            : options.fields === 'text'
              ? 'messages only'
              : 'titles only',
          options.branching === 'all-branches' ? 'all branches' : 'active path',
          options.role === 'all' ? '' : `role ${options.role}`,
          options.startInclusive ? `from ${options.startInclusive.slice(0, 10)} UTC` : '',
          options.endExclusive ? `before ${options.endExclusive.slice(0, 10)} UTC` : '',
          options.caseSensitive ? 'case sensitive' : '',
          options.selectedIds ? `only ${options.selectedIds.length} selected chats` : '',
        ].filter(Boolean)
      : [];
    container.innerHTML = `<div class="empty-state"><h3>No matches in this local snapshot.</h3><p>This does not mean the chat is absent from your account.</p><p>Searched with: ${escapeHtml(filters.join(' · ') || 'default options')}. Try Anywhere in chat, All branches or fewer filters.</p><p>${dataset.conversations.length} chats / ${result.indexedMessages} indexed messages. ${warnings} integrity warnings. No parser errors in committed import.</p><p>Source: ${escapeHtml(dataset.sourceName)}. Imported ${escapeHtml(dataset.importedAt)}.</p></div>`;
  }
  const byId = new Map(dataset.conversations.map((chat) => [chat.id, chat]));
  for (const group of orderedGroups().slice(0, shownChats)) {
    const chat = byId.get(group.chatId)!;
    const card = document.createElement('article');
    card.className = `chat-card${selected.has(chat.id) ? ' selected' : ''}`;
    const firstHit = group.hits.find((hit) => hit.messageId) ?? group.hits[0]!;
    const message = chat.messages.find((message) => message.id === firstHit.messageId);
    const text =
      message?.text ??
      (firstHit.field === 'title'
        ? chat.title
        : 'Included by query logic; no positive text occurrence required.');
    card.innerHTML = `<div class="chat-row"><label class="chat-checkbox"><input type="checkbox" ${selected.has(chat.id) ? 'checked' : ''} aria-label="Select ${escapeHtml(chat.title)}"></label><div class="chat-info"><button class="chat-title">${escapeHtml(chat.title)}</button><div class="chat-meta"><span>${escapeHtml(chat.project ?? 'Project unknown')}</span><span>${formatTime(chat.createdAt)}</span><span>${branchMessages(chat, branching()).length} messages</span></div></div><span class="hit-pill">${group.hits.filter((hit) => hit.messageId).length} message hits</span><button class="quiet open-chat" aria-label="View ${escapeHtml(chat.title)}">View <span aria-hidden="true">&#8599;</span></button></div>
      <div class="chat-preview">${input('discreet').checked ? '<p class="muted">Preview hidden. Open the local viewer to reveal content.</p>' : `<p>${snippet(text, firstHit)}</p>`}</div>
      <details class="hit-details"><summary>${group.hits.length} result records &middot; ${group.hits.reduce((sum, hit) => sum + hit.occurrences, 0)} occurrences &middot; ${chat.warnings.length ? `${chat.warnings.length} coverage warnings` : 'Export text indexed'}</summary><div class="hit-list"></div></details>`;
    card.querySelector<HTMLInputElement>('input')!.addEventListener('change', (event) => {
      const checked = (event.currentTarget as HTMLInputElement).checked;
      if (checked) selected.add(chat.id);
      else selected.delete(chat.id);
      card.classList.toggle('selected', checked);
      updateControls();
      element('results-summary').textContent =
        `${result!.groups.length} matching chats. ${selected.size} selected across the library.`;
      if (input('within-selection').checked) void runSearch();
    });
    card.querySelector('.chat-title')!.addEventListener('click', () => openViewer(chat, firstHit));
    card.querySelector('.open-chat')!.addEventListener('click', () => openViewer(chat, firstHit));
    const details = card.querySelector<HTMLDetailsElement>('details')!;
    details.addEventListener('toggle', () => {
      if (!details.open || details.dataset.loaded) return;
      details.dataset.loaded = 'true';
      const list = details.querySelector('.hit-list')!;
      let shown = 0;
      const more = document.createElement('button');
      more.className = 'quiet';
      more.textContent = 'Show more message hits';
      const append = () => {
        const messages = new Map(chat.messages.map((message) => [message.id, message]));
        for (const hit of group.hits.slice(shown, shown + 50)) {
          const item = document.createElement('button');
          item.className = 'hit-item';
          const body = hit.messageId ? messages.get(hit.messageId)!.text : chat.title;
          item.innerHTML = `<strong>${escapeHtml(hit.role ?? hit.field)} &middot; ${hit.occurrences} occurrences</strong><span>${input('discreet').checked ? 'Content hidden until opened' : snippet(body, hit)}</span>`;
          item.addEventListener('click', () => openViewer(chat, hit));
          list.insertBefore(item, more);
        }
        shown += 50;
        more.hidden = shown >= group.hits.length;
      };
      more.addEventListener('click', append);
      list.append(more);
      append();
    });
    container.append(card);
  }
  button('more-results').hidden = shownChats >= result.groups.length;
}

async function runSearch() {
  if (!dataset || busy) return;
  const generation = ++latestSearch;
  searching = true;
  updateControls();
  try {
    clearError();
    const options = searchOptions();
    announce('Searching the local index...');
    const response = await request({ type: 'search', options });
    if (generation !== latestSearch || response.type !== 'results') return;
    lastOptions = options;
    result = response.result;
    searching = false;
    shownChats = 40;
    renderResults();
    announce(
      `${result.groups.length} matching chats; ${result.messageCount} matching messages. Scope: ${options.scope}.`,
    );
  } catch (error) {
    if (generation === latestSearch) {
      searching = false;
      result = null;
      element('results').replaceChildren();
      element('hit-count').textContent = 'Invalid query';
      element('occurrence-count').textContent = 'No results shown for an invalid query';
      element('results-summary').textContent = 'Search error; no result set is available.';
      button('more-results').hidden = true;
      updateControls();
      showError(error);
      announce('Search stopped. Correct the query or filters to continue.');
    }
  }
}

async function importFile(file: File) {
  busy = true;
  searching = false;
  latestSearch++;
  clearError();
  updateControls();
  announce(`Opening ${file.name} locally...`);
  try {
    const response = await request({ type: 'import', file });
    if (response.type !== 'dataset' || !response.dataset)
      throw new Error('Import returned no dataset.');
    dataset = response.dataset;
    storageProblem = false;
    updates.postMessage('snapshot-changed');
    selected = new Set();
    result = null;
    input('within-selection').checked = false;
    busy = false;
    renderInventory();
    await runSearch();
    announce(
      `Imported ${dataset.conversations.length} chats. Original source file unchanged. Snapshot saved on this device.`,
    );
  } catch (error) {
    showError(error);
    announce(
      dataset
        ? 'Import failed. The previous local library was preserved.'
        : 'Import failed. Nothing was saved; choose a supported export file to try again.',
    );
  } finally {
    busy = false;
    input('import-file').value = '';
    updateControls();
  }
}

let viewerChat: Conversation | null = null;
let viewerHitIndex = 0;
let viewerPage = 0;
const viewerSize = 60;
function viewerHits(): Hit[] {
  return (
    result?.groups
      .find((group) => group.chatId === viewerChat?.id)
      ?.hits.filter((hit) => hit.messageId) ?? []
  );
}
function renderViewer() {
  if (!viewerChat) return;
  const chat = viewerChat;
  const messages = branchMessages(chat, branching());
  const hits = viewerHits();
  const targetId = hits[viewerHitIndex]?.messageId;
  element('viewer-title').textContent = chat.title;
  element('viewer-meta').innerHTML =
    `<p class="muted">Chat ID: ${escapeHtml(chat.id)} &middot; Source: ${escapeHtml(dataset?.sourceName ?? '')} &middot; ${branching()}</p><p>${chat.originalUrl ? `<a href="${escapeHtml(chat.originalUrl)}" target="_blank" rel="noreferrer noopener">Open source URL (access not checked)</a>` : 'Original URL not supplied. No live message link has been fabricated.'}</p><details><summary>Source &amp; coverage (${chat.warnings.length} warnings)</summary><p>Fingerprint: ${escapeHtml(dataset?.sourceExportId ?? '')}</p><p>Missing timestamps: ${messages.filter((message) => !message.timestamp).length}</p><ul>${chat.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('') || '<li>All available exported text under this branch policy is indexed. Live-account coverage is unknown.</li>'}</ul></details>`;
  const container = element('viewer-messages');
  container.replaceChildren();
  for (const [offset, message] of messages
    .slice(viewerPage * viewerSize, (viewerPage + 1) * viewerSize)
    .entries()) {
    const article = document.createElement('article');
    article.className = `message${message.id === targetId ? ' matched-message' : ''}`;
    const hit = hits.find((hit) => hit.messageId === message.id);
    article.innerHTML = `<div class="message-heading"><strong>${escapeHtml(message.role)}</strong><span>${formatTime(message.timestamp)} &middot; #${viewerPage * viewerSize + offset + 1}</span></div><p class="message-id">Message ID: ${escapeHtml(message.id)} / Node: ${escapeHtml(message.nodeId)}</p><pre></pre>`;
    const pre = article.querySelector('pre')!;
    if (!hit?.offsets.length) pre.textContent = message.text || '[Text unavailable in export]';
    else {
      let cursor = 0;
      for (const range of hit.offsets) {
        if (range.end <= cursor) continue;
        pre.append(
          document.createTextNode(message.text.slice(cursor, Math.max(cursor, range.start))),
        );
        const mark = document.createElement('mark');
        mark.textContent = message.text.slice(Math.max(cursor, range.start), range.end);
        pre.append(mark);
        cursor = range.end;
      }
      pre.append(document.createTextNode(message.text.slice(cursor)));
    }
    container.append(article);
  }
  if (!messages.length)
    container.textContent =
      'No messages available under this branch policy. Try All branches if the export has no active-path marker.';
  element('viewer-position').textContent = hits.length
    ? `Message hit ${viewerHitIndex + 1} of ${hits.length}`
    : 'No message-specific hit';
  element('viewer-page').textContent = messages.length
    ? `Messages ${viewerPage * viewerSize + 1}-${Math.min(messages.length, (viewerPage + 1) * viewerSize)} of ${messages.length}`
    : '0 messages';
  button('previous-hit').disabled = !hits.length || viewerHitIndex === 0;
  button('next-hit').disabled = !hits.length || viewerHitIndex >= hits.length - 1;
  button('previous-page').disabled = viewerPage === 0;
  button('next-page').disabled = (viewerPage + 1) * viewerSize >= messages.length;
  container.querySelector('.matched-message')?.scrollIntoView({ block: 'center' });
}
function openViewer(chat: Conversation, hit: Hit) {
  viewerChat = chat;
  const hits = viewerHits();
  viewerHitIndex = Math.max(
    0,
    hits.findIndex((value) => value.messageId === hit.messageId),
  );
  const messages = branchMessages(chat, branching());
  viewerPage = Math.max(
    0,
    Math.floor(messages.findIndex((message) => message.id === hit.messageId) / viewerSize),
  );
  const dialog = element<HTMLDialogElement>('viewer');
  dialog.showModal();
  renderViewer();
}
function moveHit(delta: number) {
  if (!viewerChat) return;
  viewerHitIndex += delta;
  const id = viewerHits()[viewerHitIndex]?.messageId;
  viewerPage = Math.max(
    0,
    Math.floor(
      branchMessages(viewerChat, branching()).findIndex((message) => message.id === id) /
        viewerSize,
    ),
  );
  renderViewer();
}

function showAction(title: string, body: string) {
  element('action-title').textContent = title;
  element('action-body').innerHTML = body;
  element<HTMLDialogElement>('action-dialog').showModal();
}
function selectedChats(): Conversation[] {
  return dataset?.conversations.filter((chat) => selected.has(chat.id)) ?? [];
}
function sourceList(report?: Statistics): string {
  const sources = new Map(report?.sources.map((source) => [source.id, source]) ?? []);
  return `<h3>All selected chats (${selected.size})</h3><ul class="source-list">${selectedChats()
    .map((chat) => {
      const source = sources.get(chat.id);
      return `<li><strong>${escapeHtml(chat.title)}</strong><span>${escapeHtml(chat.id)} &middot; ${escapeHtml(chat.project ?? 'Project unknown')} &middot; ${branchMessages(chat, branching()).length} messages</span>${source ? `<span>First: ${formatTime(source.firstMessageAt)} / Last: ${formatTime(source.lastMessageAt)} / Missing times: ${source.missingTimestamps}</span><span>${source.words} words / ${source.characters} codepoints / Roles: ${escapeHtml(JSON.stringify(source.roles))}</span>` : ''}<span>${chat.warnings.length} coverage warnings / Selection: explicit checkbox or selection command</span>${chat.originalUrl ? `<a href="${escapeHtml(chat.originalUrl)}" target="_blank" rel="noreferrer noopener">Source URL (access not checked)</a>` : '<span>Original link unavailable: no valid URL supplied by source</span>'}</li>`;
    })
    .join('')}</ul>`;
}
function exportControls(kind: 'conversations' | 'statistics') {
  return `<div class="export-controls"><label>Format <select id="export-format"><option value="json">JSON (exact source text)</option><option value="csv">CSV (spreadsheet-safe)</option><option value="html">HTML (offline readable)</option><option value="txt">TXT</option></select></label><p>Download is a ZIP containing the report, SHA-256 manifest, and notes. All messages in selected chats under <strong>${branching()}</strong> are included, not just search matches. Attachments are references only. PDF and advanced splits are not implemented yet.</p><label class="check-label"><input id="confirm-export" type="checkbox"> I reviewed the selection and understand it may contain private content.</label><button id="download" class="button primary" disabled>Download ${kind === 'statistics' ? 'statistics' : 'conversations'} ZIP</button></div>`;
}
function wireDownload(kind: 'conversations' | 'statistics') {
  input('confirm-export').addEventListener('change', () => {
    button('download').disabled = !input('confirm-export').checked;
  });
  button('download').addEventListener('click', () => {
    void (async () => {
      try {
        clearError();
        button('download').disabled = true;
        button('download').textContent = 'Preparing local export...';
        const format = select('export-format').value as ExportFormat;
        const response = await request({
          type: 'export',
          chatIds: [...selected],
          branching: branching(),
          format,
          kind,
          filter: lastOptions,
        });
        if (response.type !== 'download') throw new Error('Export returned no downloadable file.');
        const url = URL.createObjectURL(
          new Blob([new Uint8Array(response.bytes).buffer], { type: 'application/zip' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = response.filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        element<HTMLDialogElement>('action-dialog').close();
        announce(
          `Export ready: ${response.filename}. All ${selected.size} selected chats included.`,
        );
      } catch (error) {
        element<HTMLDialogElement>('action-dialog').close();
        showError(error);
      }
    })();
  });
}

element('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void runSearch();
});
for (const id of [
  'scope',
  'fields',
  'branching',
  'role',
  'date-from',
  'date-to',
  'case-sensitive',
  'within-selection',
]) {
  element(id).addEventListener('change', () => {
    void runSearch();
  });
}
element('discreet').addEventListener('change', renderResults);
element('sort').addEventListener('change', renderResults);
button('more-results').addEventListener('click', () => {
  shownChats += 40;
  renderResults();
});
button('import-button').addEventListener('click', () => input('import-file').click());
input('import-file').addEventListener('change', () => {
  const file = input('import-file').files?.[0];
  if (file) void importFile(file);
});
button('demo').addEventListener('click', () => {
  void importFile(new File([demoExport()], demoFileName, { type: 'application/json' }));
});
for (const [id, mode] of [
  ['select-all', 'all'],
  ['select-first', 'first'],
  ['select-last', 'last'],
] as const) {
  button(id).addEventListener('click', () => {
    try {
      selected = selectIds(
        selected,
        orderedGroups().map((group) => group.chatId),
        mode,
        input('select-count').valueAsNumber,
      );
      if (input('within-selection').checked) void runSearch();
      else renderResults();
      announce(`${selected.size} chats selected.`);
    } catch (error) {
      showError(error);
    }
  });
}
button('clear-selection').addEventListener('click', () => {
  selected.clear();
  if (input('within-selection').checked) void runSearch();
  else renderResults();
});
button('close-viewer').addEventListener('click', () =>
  element<HTMLDialogElement>('viewer').close(),
);
button('close-action').addEventListener('click', () =>
  element<HTMLDialogElement>('action-dialog').close(),
);
button('previous-hit').addEventListener('click', () => moveHit(-1));
button('next-hit').addEventListener('click', () => moveHit(1));
button('previous-page').addEventListener('click', () => {
  viewerPage--;
  renderViewer();
});
button('next-page').addEventListener('click', () => {
  viewerPage++;
  renderViewer();
});
button('export').addEventListener('click', () => {
  showAction(
    'Review your conversation export',
    `${sourceList()}${exportControls('conversations')}`,
  );
  wireDownload('conversations');
});
button('stats').addEventListener('click', () => {
  void (async () => {
    busy = true;
    updateControls();
    announce('Calculating statistics locally...');
    try {
      const response = await request({
        type: 'statistics',
        chatIds: [...selected],
        branching: branching(),
      });
      if (response.type !== 'statistics')
        throw new Error('Statistics calculation returned no report.');
      const report = response.report;
      showAction(
        'Your selection, in perspective',
        `<div class="stat-summary"><strong>${report.chats} chats</strong><strong>${report.messages} messages</strong><strong>${report.words} words</strong></div><p>Weighted words/message: ${report.weightedMeanWords?.toFixed(2) ?? 'Unknown'} (${report.messages} messages). Mean of chat means: ${report.meanOfChatMeans?.toFixed(2) ?? 'Unknown'} (${report.sources.filter((s) => s.messages).length} nonempty chats).</p><p class="muted">Words: Intl.Segmenter word-like segments. Characters: Unicode codepoints. Branch policy: ${branching()}. Full chats, not just matches. Export includes per-chat metrics, roles, dates and coverage.</p>${sourceList(report)}${exportControls('statistics')}`,
      );
      wireDownload('statistics');
      announce('Statistics ready. Every selected chat is listed.');
    } catch (error) {
      showError(error);
    } finally {
      busy = false;
      updateControls();
    }
  })();
});
button('privacy').addEventListener('click', () =>
  showAction(
    'Local-first means local.',
    '<p>ChatFlow stores one imported snapshot in IndexedDB in this browser profile. The snapshot is <strong>not encrypted</strong>; anyone with access to this browser profile can read it until you clear it. Searches are not saved. Nothing is sent to a server. There are no host permissions, analytics, ads, account credentials, or live actions.</p><p>Importing replaces the previous snapshot only after validation and a successful database transaction. A failed import keeps the previous snapshot. Clear local data removes the saved snapshot and in-memory index; original source files and downloads are untouched.</p><p>This is an offline foundation, not the complete V5 product. PDF, semantic search, saved sets, redaction, advanced splitting and live organizing remain future work. Only available exported text can be indexed; attachment bytes are not copied. Safety budgets: 128 MiB input, 256 MiB expanded conversation JSON, 10,000 ZIP entries.</p><p>URLs are accepted only from source data after HTTPS/host/path checks. Account access is not checked. Missing links and timestamps are never invented. Source messages are displayed as text, never executed.</p><p>Independent tool, not developed, supported or certified by OpenAI.</p>',
  ),
);
button('forget').addEventListener('click', () => {
  showAction(
    'Clear this local snapshot?',
    '<p>This removes imported conversations from ChatFlow on this device. It does not delete anything from ChatGPT, your source export, or your downloads.</p><button id="confirm-forget" class="button danger">Clear local snapshot</button>',
  );
  button('confirm-forget').addEventListener('click', () => {
    void (async () => {
      busy = true;
      latestSearch++;
      updateControls();
      try {
        await request({ type: 'clear' });
        updates.postMessage('snapshot-cleared');
        location.reload();
      } catch (error) {
        element<HTMLDialogElement>('action-dialog').close();
        showError(error);
        busy = false;
        searching = false;
        updateControls();
      }
    })();
  });
});

void (async () => {
  busy = true;
  updateControls();
  try {
    const response = await request({ type: 'restore' });
    if (response.type === 'dataset') dataset = response.dataset;
    busy = false;
    renderInventory();
    if (dataset) await runSearch();
    else announce('Ready for your first import. Everything stays on this device.');
  } catch (error) {
    storageProblem = true;
    showError(error);
  } finally {
    busy = false;
    updateControls();
  }
})();
