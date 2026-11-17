export interface GuideAction {
  label: string;
  run: () => void;
}

export interface GuideContent {
  step: number;
  title: string;
  message: string;
  tone?: 'active' | 'busy' | 'success' | 'warning' | 'error';
  action?: GuideAction;
  secondary?: GuideAction;
}

export function mountWorkflowGuide(root: HTMLElement, steps: readonly string[]) {
  root.classList.add('workflow-guide');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Live step-by-step guide');
  root.innerHTML = `
    <div class="workflow-guide-top"><span class="workflow-guide-eyebrow">YOUR NEXT STEP</span><span class="workflow-guide-badge"></span></div>
    <ol class="workflow-guide-steps" aria-label="Workflow steps" tabindex="0" title="Use the arrow keys to scroll through the steps"></ol>
    <div class="workflow-guide-copy" aria-live="polite" aria-atomic="true"><h2></h2><p></p></div>
    <div class="workflow-guide-actions"><button type="button" class="button small primary" hidden></button><button type="button" class="button small" hidden></button></div>
  `;
  const list = root.querySelector<HTMLOListElement>('ol')!;
  const items = steps.map((label, index) => {
    const item = document.createElement('li');
    const number = document.createElement('span');
    number.className = 'workflow-guide-number';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = String(index + 1);
    const text = document.createElement('span');
    text.textContent = label;
    item.append(number, text);
    list.append(item);
    return item;
  });
  const badge = root.querySelector<HTMLElement>('.workflow-guide-badge')!;
  const title = root.querySelector<HTMLHeadingElement>('h2')!;
  const message = root.querySelector<HTMLParagraphElement>('.workflow-guide-copy p')!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('.workflow-guide-actions button')];
  const actions: (GuideAction | undefined)[] = [];
  buttons.forEach((button, index) => button.addEventListener('click', () => actions[index]?.run()));
  return {
    update(content: GuideContent) {
      const tone = content.tone ?? 'active';
      root.dataset.tone = tone;
      root.dataset.step = String(content.step + 1);
      badge.textContent =
        tone === 'busy'
          ? 'Working'
          : tone === 'warning'
            ? 'Attention'
            : tone === 'error'
              ? 'Needs a fix'
              : tone === 'success'
                ? 'Ready'
                : 'Next action';
      items.forEach((item, index) => {
        const state =
          index < content.step ? 'done' : index === content.step ? 'current' : 'upcoming';
        item.dataset.state = state;
        item.setAttribute('aria-label', `${steps[index]}: ${state}`);
        if (state === 'current') item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
      if (title.textContent !== content.title) title.textContent = content.title;
      if (message.textContent !== content.message) message.textContent = content.message;
      [content.action, content.secondary].forEach((action, index) => {
        actions[index] = action;
        const button = buttons[index]!;
        button.hidden = !action;
        if (action) button.textContent = action.label;
      });
    },
  };
}
