import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['assets/', 'node_modules/', 'dev/.cache/'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.browser } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }], eqeqeq: 'error', 'prefer-const': 'error' },
  },
  { files: ['dev/**', 'tests/**', '*.mjs'], languageOptions: { globals: { ...globals.node } } },
];
