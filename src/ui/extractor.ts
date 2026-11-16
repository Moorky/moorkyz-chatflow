import { connectChatGPT } from '../extraction/chatgpt';
import {
  extractionBundle,
  newExtraction,
  runExtraction,
  validateExtractionOptions,
} from '../extraction/engine';
import type { ExtractionOptions, ExtractionState } from '../extraction/engine';
import { openExtractionStore } from '../extraction/store';
import { errorMessage } from '../shared/model';
import { mountExpressionToolbar } from './expression-toolbar';
import { downloadBytes } from './download';
import styles from './styles.css?inline';

export async function mountExtractor(parent: HTMLElement, fetcher: typeof fetch = fetch) {
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;inset:16px;z-index:2147483647;max-width:760px;margin:auto;overflow:auto;background:var(--surface,#fff);color:var(--text,#232638);border:1px solid #656b80;border-radius:12px;box-shadow:0 12px 64px #0008;';
  parent.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent =
    styles.replaceAll(':root', ':host') +
    `
    :host {font:14px/1.6 system-ui;color-scheme:light dark;}
    .extractor {padding:20px;background:var(--surface,#fff);color:var(--text,#232638);min-height:100%;}
    h1 {font-size:24px;margin:0;}
    .extractor-form {display:grid;gap:12px;}
    .extractor-form>label,.extractor-advanced>label {display:grid;gap:4px;margin:6px 0;}
    .extractor-actions {display:flex;flex-wrap:wrap;gap:8px;margin:14px 0;}
    .extractor-progress {white-space:pre-wrap;overflow-wrap:anywhere;color:var(--text,#232638);background:var(--surface,#fff);}
    .extractor * {box-sizing:border-box;}
  `;
  const view = document.createElement('section');
  view.className = 'extractor';
  view.setAttribute('role', 'region');
  view.setAttribute('aria-label', 'ChatFlow direct extraction prototype');
  view.innerHTML = `
    <div class="dialog-heading"><h1>ChatFlow direct export <small>prototype</small></h1><button type="button" class="button" id="close">Close</button></div>
    <p>Read-only, experimental ChatGPT adapter. Only run this on your own account. Internal endpoints may change. No account-wide completeness is claimed.</p>
    <p>Conversation data and recovery checkpoints stay <strong>unencrypted in this ChatGPT browser profile</strong> until cleared. No attachment binaries, project instructions or files are downloaded. Keep your official backup.</p>
    <form class="extractor-form">
      <label>Export mode<select id="mode"><option value="single">Single chat</option><option value="keywords">By keywords</option><option value="project">Project (exact project ID)</option><option value="all">All discovered chats</option></select></label>
      <label>Conversation URL / project ID<input id="target" type="text"></label>
      <div id="expression"></div>
      <details class="extractor-advanced"><summary>Workspace and performance options</summary>
      <label>Workspace account ID (blank = session default; not automatically the workspace shown in another tab)<input id="workspace" type="text" autocomplete="off"></label>
      <label>Parallel requests (1-4)<input id="concurrency" type="number" min="1" max="4" value="2"></label>
      <label class="check-label"><input id="archived" type="checkbox"> Include archived inventory (if accessible)</label>
      </details>
      <label class="check-label"><input id="consent" type="checkbox" required> I authorize read-only extraction of my selected account/workspace and local checkpoint storage.</label>
      <div class="extractor-actions"><button class="button primary" id="start">Start new export</button><button type="button" class="button" id="resume" disabled>Resume / update checkpoint</button><button type="button" class="button" id="pause" disabled>Pause</button><button type="button" class="button" id="cancel" disabled>Cancel</button><button type="button" class="button" id="download" disabled>Download available ZIP</button><button type="button" class="button danger" id="clear" disabled>Clear checkpoints</button></div>
    </form>
    <p id="progress" class="extractor-progress" role="status" aria-live="polite">Ready. No account request has been made.</p>
    <p id="failure" role="alert" hidden></p>
    <details><summary>Results and warnings</summary><ul id="outcomes"></ul></details>
    <p>Import the downloaded ZIP into ChatFlow. The ZIP contains individual versioned JSON files, a manifest and an importer-compatible conversations.json. Pause/cancel keeps saved results; clear removes them. Rerun this script after reload to recover.</p>
  `;
  shadow.append(style, view);
  const element = <T extends HTMLElement>(id: string) => view.querySelector<T>(`#${id}`)!;
  const input = (id: string) => element<HTMLInputElement>(id);
  const button = (id: string) => element<HTMLButtonElement>(id);
  const field = element<HTMLSelectElement>('mode');
  if (/^\/(?:c|g\/[^/]+\/c)\/[a-zA-Z0-9_-]+\/?$/.test(location.pathname))
    input('target').value = location.href;
  const progress = element<HTMLParagraphElement>('progress');
  const failure = element<HTMLParagraphElement>('failure');
  const showError = (error: unknown) => {
    failure.textContent = errorMessage(error);
    failure.hidden = false;
  };
  const toolbar = mountExpressionToolbar(element('expression'), {
    inputId: 'extract-query',
    scopeId: 'extract-fields',
    onClear: () => {},
    onReset: () => {},
  });
  let state: ExtractionState | null = null;
  let active: AbortController | null = null;
  let storage: Awaited<ReturnType<typeof openExtractionStore>> | null = null;
  let downloading = false;
  function controls() {
    const running = Boolean(active) || downloading;
    for (const id of ['start', 'resume', 'clear', 'download'])
      button(id).disabled =
        running || ((id === 'resume' || id === 'download') && !state) || !storage;
    button('pause').disabled = !active;
    button('cancel').disabled = !active;
    button('close').disabled = running;
    for (const control of view.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      'input,select',
    ))
      control.disabled = running;
    toolbar.setDisabled(running);
  }
  function render(current: ExtractionState) {
    const entries = Object.values(current.entries);
    const exported = entries.filter((entry) => entry.status === 'exported');
    const processed = entries.length;
    const elapsed = Math.max(0, Date.now() - Date.parse(current.startTime));
    progress.textContent = [
      `${current.status} | operation ${current.id}`,
      `Discovered: ${current.inventory.length} | Processed: ${processed} | Remaining: ${Math.max(0, current.inventory.length - processed)}`,
      `Exported: ${exported.length} | Filtered: ${entries.filter((entry) => entry.status === 'filtered').length} | Failed: ${entries.filter((entry) => entry.status === 'failed').length}`,
      `Messages: ${exported.reduce((sum, entry) => sum + entry.messages, 0)} | Wall time since start: ${Math.floor(elapsed / 1000)}s | ETA unavailable`,
      'Completeness: unverified. Available results can be downloaded even after interruption.',
    ].join('\n');
    if (current.error) showError(current.error);
    const outcomes = element<HTMLUListElement>('outcomes');
    outcomes.replaceChildren();
    const details = [
      ...current.warnings,
      ...entries
        .filter((entry) => entry.status === 'failed')
        .map((entry) => `${entry.item.title || entry.item.id}: ${entry.error}`),
    ];
    for (const text of details.slice(0, 50)) {
      const item = document.createElement('li');
      item.textContent = text;
      outcomes.append(item);
    }
    if (details.length > 50) {
      const note = document.createElement('li');
      note.textContent = `${details.length - 50} further warnings/errors are recorded in the downloaded manifest.`;
      outcomes.append(note);
    }
  }
  const readOptions = (): ExtractionOptions => ({
    mode:
      field.value === 'all'
        ? 'all'
        : field.value === 'keywords'
          ? 'keywords'
          : field.value === 'project'
            ? 'project'
            : 'single',
    target: input('target').value.trim(),
    query: input('extract-query').value,
    fields: element<HTMLSelectElement>('extract-fields').value === 'title' ? 'title' : 'both',
    workspaceId: input('workspace').value.trim(),
    concurrency: input('concurrency').valueAsNumber,
    includeArchived: input('archived').checked,
  });
  const syncMode = () => {
    element('expression').hidden = field.value !== 'keywords';
    element('target').parentElement!.hidden = field.value !== 'single' && field.value !== 'project';
  };
  function applyOptions(options: ExtractionOptions) {
    field.value = options.mode;
    input('target').value = options.target;
    input('workspace').value = options.workspaceId;
    input('extract-query').value = options.query;
    element<HTMLSelectElement>('extract-fields').value = options.fields;
    input('concurrency').value = String(options.concurrency);
    input('archived').checked = options.includeArchived;
    toolbar.validate();
    syncMode();
  }
  field.addEventListener('change', syncMode);
  // The extraction engine supports title/both only; retain the shared toolbar without a misleading scope.
  element<HTMLSelectElement>('extract-fields').querySelector('option[value="text"]')!.remove();
  syncMode();
  async function exclusive(action: () => Promise<void>) {
    try {
      await navigator.locks.request(
        'moorkyz-chatflow-extractor',
        { ifAvailable: true },
        async (lock) => {
          if (!lock)
            throw new Error(
              'Another ChatFlow extractor is active in this profile. Pause or close it first.',
            );
          await action();
        },
      );
    } catch (error) {
      showError(error);
    }
  }
  async function start(resume: boolean) {
    if (active || !storage) return;
    failure.hidden = true;
    if (!input('consent').checked) {
      showError('Confirm read-only account access and checkpoint storage first.');
      return;
    }
    active = new AbortController();
    controls();
    try {
      const options = resume && state ? state.options : readOptions();
      if (resume) applyOptions(options);
      validateExtractionOptions(options);
      if (!resume && !toolbar.validate() && options.mode === 'keywords') return;
      const adapter = await connectChatGPT(fetcher, options.workspaceId, active.signal);
      if (!resume) {
        if (
          state &&
          !confirm(
            'Starting a new export clears this script’s previous checkpoint and saved conversations. Continue?',
          )
        )
          return;
        await storage.clear();
        state = newExtraction(options, adapter.accountKey);
      }
      if (!state) throw new Error('No checkpoint is available.');
      await runExtraction(state, adapter, storage.store, active.signal, render);
    } catch (error) {
      showError(error);
    } finally {
      active = null;
      controls();
    }
  }
  view.querySelector('form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    void exclusive(() => start(false));
  });
  button('resume').addEventListener('click', () => {
    void exclusive(() => start(true));
  });
  button('pause').addEventListener('click', () => active?.abort('pause'));
  button('cancel').addEventListener('click', () => active?.abort('cancel'));
  button('download').addEventListener('click', () => {
    void exclusive(async () => {
      if (!state || !storage) return;
      downloading = true;
      controls();
      failure.hidden = true;
      try {
        downloadBytes(
          await extractionBundle(state, storage.store),
          `chatflow-direct-${state.id}.zip`,
        );
      } catch (error) {
        showError(error);
      } finally {
        downloading = false;
        controls();
      }
    });
  });
  button('clear').addEventListener('click', () => {
    void exclusive(async () => {
      if (
        !storage ||
        !confirm(
          'Remove all local ChatFlow extraction checkpoints and saved conversations from this ChatGPT profile? Downloads are not deleted.',
        )
      )
        return;
      try {
        await storage.clear();
        state = null;
        progress.textContent = 'Checkpoints cleared. Downloads were not deleted.';
        failure.hidden = true;
      } catch (error) {
        showError(error);
      } finally {
        controls();
      }
    });
  });
  button('close').addEventListener('click', () => {
    storage?.close();
    host.remove();
  });
  try {
    storage = await openExtractionStore();
    state = await storage.load();
    if (state) {
      render(state);
      applyOptions(state.options);
    }
  } catch (error) {
    showError(error);
  }
  controls();
  return host;
}

if (location.origin === 'https://chatgpt.com' && window.top === window) {
  void mountExtractor(document.body).catch((error: unknown) => {
    alert(`ChatFlow extractor failed: ${errorMessage(error)}`);
  });
}
