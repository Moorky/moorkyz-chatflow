import { expressionAssistance, insertExpression } from '../search/expression';
import type { ExpressionAction } from '../search/expression';

const tools: { action: ExpressionAction; label: string; description: string }[] = [
  { action: 'AND', label: 'AND', description: 'Require both terms: migration AND rollback.' },
  { action: 'OR', label: 'OR', description: 'Match either term: evidence OR chatflow.' },
  { action: 'NOT', label: 'NOT', description: 'Exclude a term: moorkyz NOT test.' },
  {
    action: '*',
    label: '*',
    description: 'Match within a word: moorkyz*, *evidence*, or moor*yz.',
  },
  {
    action: 'phrase',
    label: '" "',
    description: 'Match an exact phrase: "agentic heaven". Wrap selected text.',
  },
  {
    action: 'group',
    label: '( )',
    description: 'Group conditions: (evidence OR chatflow) AND MVP. Wrap selected text.',
  },
  {
    action: '"',
    label: 'Close quote',
    description: 'Finish the current exact phrase with a quotation mark.',
  },
  {
    action: ')',
    label: 'Close group',
    description: 'Finish the current expression group with a closing parenthesis.',
  },
];

export function mountExpressionToolbar(
  root: HTMLElement,
  options: {
    inputId: string;
    scopeId: string;
    onClear: () => void;
    onReset: () => void;
  },
) {
  root.classList.add('expression-search');
  root.innerHTML = `
    <div class="expression-field">
      <label class="sr-only">Search query</label>
      <input type="search" placeholder="Search a thought, a phrase, a possibility..." autocomplete="off" spellcheck="false">
      <button type="button" class="expression-toggle" aria-label="Advanced expression toolbar" aria-expanded="false" title="Advanced expression toolbar (Alt + Down to expand)">
        <svg class="expression-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m5 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <div class="expression-panel" aria-hidden="true">
      <div class="expression-panel-body">
        <div class="expression-tools" role="group" aria-label="Expression tools"></div>
        <div class="expression-options">
          <label>Search scope <select><option value="both">Title &amp; Messages</option><option value="title">Title Only</option><option value="text">Messages Only</option></select></label>
          <button type="button" class="quiet expression-clear" aria-label="Clear expression" title="Clear the expression; keep your search options">Clear</button>
          <button type="button" class="quiet expression-reset" aria-label="Reset search" title="Clear the expression and restore default search options">Reset</button>
        </div>
        <p class="expression-hint"></p>
        <div class="expression-suggestions" role="group" aria-label="Suggested next expressions"></div>
        <p class="expression-keyboard">Type expressions directly, or Tab to any control. Alt + Down/Up expands/collapses; Escape collapses. Enter searches.</p>
      </div>
    </div>
    <p class="expression-feedback" role="status" aria-live="polite" aria-atomic="true" hidden></p>
  `;
  const input = root.querySelector<HTMLInputElement>('input')!;
  input.id = options.inputId;
  root.querySelector<HTMLLabelElement>('.expression-field label')!.htmlFor = input.id;
  input.setAttribute('aria-keyshortcuts', 'Alt+ArrowDown Alt+ArrowUp');
  const scope = root.querySelector<HTMLSelectElement>('select')!;
  scope.id = options.scopeId;
  const toggle = root.querySelector<HTMLButtonElement>('.expression-toggle')!;
  const panel = root.querySelector<HTMLDivElement>('.expression-panel')!;
  panel.id = `${input.id}-tools`;
  panel.inert = true;
  toggle.setAttribute('aria-controls', panel.id);
  const feedback = root.querySelector<HTMLParagraphElement>('.expression-feedback')!;
  feedback.id = `${input.id}-feedback`;
  const hint = root.querySelector<HTMLParagraphElement>('.expression-hint')!;
  hint.id = `${input.id}-hint`;
  input.setAttribute('aria-describedby', `${feedback.id} ${hint.id}`);
  const suggestions = root.querySelector<HTMLDivElement>('.expression-suggestions')!;
  let expanded = false;
  let disabled = false;

  function setExpanded(value: boolean) {
    expanded = value;
    root.dataset.expanded = String(value);
    toggle.setAttribute('aria-expanded', String(value));
    panel.setAttribute('aria-hidden', String(!value));
    panel.inert = !value;
    input.focus({ preventScroll: true });
  }

  function insert(action: ExpressionAction) {
    const result = insertExpression(
      input.value,
      input.selectionStart ?? input.value.length,
      input.selectionEnd ?? input.value.length,
      action,
    );
    input.value = result.value;
    input.focus({ preventScroll: true });
    input.setSelectionRange(result.start, result.end);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function toolButton(action: ExpressionAction) {
    const tool = tools.find((tool) => tool.action === action)!;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'expression-tool';
    button.textContent = tool.label;
    button.setAttribute('aria-label', `Insert ${tool.label}`);
    button.setAttribute('aria-description', tool.description);
    button.title = tool.description;
    button.disabled = disabled;
    button.addEventListener('focus', () => {
      hint.textContent = tool.description;
    });
    button.addEventListener('mouseenter', () => {
      hint.textContent = tool.description;
    });
    button.addEventListener('click', () => insert(action));
    return button;
  }

  function validate() {
    const assistance = expressionAssistance(
      input.value,
      input.selectionStart ?? input.value.length,
    );
    input.setAttribute('aria-invalid', String(Boolean(assistance.error)));
    if (assistance.error) input.setAttribute('aria-errormessage', feedback.id);
    else input.removeAttribute('aria-errormessage');
    root.dataset.invalid = String(Boolean(assistance.error));
    feedback.hidden = !assistance.error;
    feedback.textContent = assistance.error ? `${assistance.error} ${assistance.correction}` : '';
    hint.textContent = assistance.hint;
    suggestions.replaceChildren(...assistance.next.map(toolButton));
    return !assistance.error;
  }

  root
    .querySelector('.expression-tools')!
    .append(...tools.slice(0, 6).map((tool) => toolButton(tool.action)));
  toggle.addEventListener('click', () => setExpanded(!expanded));
  root.addEventListener('pointerdown', (event) => {
    if (event.button === 0 && event.target instanceof Element && event.target.closest('button')) {
      event.preventDefault();
    }
  });
  root.addEventListener('keydown', (event) => {
    if (event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setExpanded(event.key === 'ArrowDown');
    } else if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      event.stopPropagation();
      setExpanded(false);
    }
  });
  for (const event of ['input', 'click', 'keyup', 'select', 'focus'])
    input.addEventListener(event, validate);
  root.querySelector('.expression-clear')!.addEventListener('click', () => {
    input.value = '';
    input.focus({ preventScroll: true });
    validate();
    options.onClear();
  });
  root.querySelector('.expression-reset')!.addEventListener('click', () => {
    input.value = '';
    scope.value = 'both';
    input.focus({ preventScroll: true });
    validate();
    options.onReset();
  });
  validate();

  return {
    validate,
    setDisabled(value: boolean) {
      disabled = value;
      input.disabled = value;
      scope.disabled = value;
      for (const button of panel.querySelectorAll<HTMLButtonElement>('button'))
        button.disabled = value;
    },
  };
}
