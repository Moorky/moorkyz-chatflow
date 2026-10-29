export function demoExport(): string {
  const examples = [
    {
      title: 'Building something that lasts',
      project: 'MOORKYZ',
      texts: [
        'How should we approach local-first search?',
        'Keep every conversation on the device. Privacy is an architectural decision, not a feature.',
      ],
    },
    {
      title: 'A better search experience',
      project: 'MOORKYZ',
      texts: [
        'We need precise message search and useful context.',
        'Use AND, OR, and NOT. Show where a match came from, then let the reader explore.',
      ],
    },
    {
      title: 'Weekend ideas',
      project: null,
      texts: [
        'A small garden, a good book, and time to experiment.',
        'Try growing herbs by the window. Start small and keep learning.',
      ],
    },
    {
      title: 'The migration notebook',
      project: 'Engineering',
      texts: [
        'How do we plan a safe migration?',
        'Make a backup first.',
        'Then verify the migration using a repeatable checklist.',
      ],
    },
  ];
  return JSON.stringify(
    examples.map((example, i) => {
      const mapping: Record<string, unknown> = {
        root: { id: 'root', parent: null, message: null },
      };
      example.texts.forEach((value, j) => {
        mapping[`node-${j}`] = {
          id: `node-${j}`,
          parent: j ? `node-${j - 1}` : 'root',
          message: {
            id: `demo-message-${i}-${j}`,
            author: { role: j % 2 ? 'assistant' : 'user' },
            create_time: 1_790_000_000 + i * 86400 + j * 60,
            content: { content_type: 'text', parts: [value] },
          },
        };
      });
      return {
        id: `synthetic-demo-${i}`,
        title: example.title,
        project_name: example.project,
        create_time: 1_790_000_000 + i * 86400,
        update_time: 1_790_000_000 + i * 86400 + 3600,
        current_node: `node-${example.texts.length - 1}`,
        mapping,
      };
    }),
  );
}
