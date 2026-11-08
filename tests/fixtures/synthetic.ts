export function conversation(
  id = 'chat-1',
  texts = ['alpha', 'beta'],
  title = 'Synthetic conversation',
): Record<string, unknown> {
  const mapping: Record<string, unknown> = {
    root: { parent: null, message: null },
  };
  texts.forEach((text, i) => {
    mapping[`n${i}`] = {
      parent: i ? `n${i - 1}` : 'root',
      message: {
        id: `${id}-m${i}`,
        author: { role: i % 2 ? 'assistant' : 'user' },
        create_time: 1_700_000_000 + i,
        content: { content_type: 'text', parts: [text] },
      },
    };
  });
  return {
    id,
    title,
    create_time: 1_700_000_000,
    update_time: 1_700_000_001,
    current_node: texts.length ? `n${texts.length - 1}` : 'root',
    mapping,
  };
}

export function branchConversation(): Record<string, unknown> {
  return {
    id: 'branched',
    title: 'Alternative answers',
    current_node: 'active',
    mapping: {
      root: { parent: null, message: null },
      question: {
        parent: 'root',
        message: { id: 'question-id', author: { role: 'user' }, content: { parts: ['question'] } },
      },
      alternate: {
        parent: 'question',
        message: {
          id: 'alternate-id',
          author: { role: 'assistant' },
          content: { parts: ['discarded answer'] },
        },
      },
      active: {
        parent: 'question',
        message: {
          id: 'active-id',
          author: { role: 'assistant' },
          content: { parts: ['chosen answer'] },
        },
      },
    },
  };
}
