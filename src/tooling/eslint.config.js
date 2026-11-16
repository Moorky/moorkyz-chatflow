import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'dist/**',
      'artifacts/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      globals: { console: 'readonly', Buffer: 'readonly', process: 'readonly', chrome: 'readonly' },
    },
  },
];
