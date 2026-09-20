// @ts-check
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['dist', 'dev-dist', 'coverage', 'node_modules', 'playwright-report', 'test-results'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },

  // T005 — Princípio V, tornado verificável por ferramenta.
  // `src/domain/` é TypeScript puro: sem React, sem Dexie, sem DOM. A regra de
  // domínio precisa ser testável sem interface, e disciplina não é mecanismo.
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    languageOptions: {
      // Sem globals de browser: usar `document`, `window`, `localStorage` ou
      // `crypto` dentro do domínio vira erro de `no-undef` por construção.
      globals: { ...globals.es2022 },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'react-*',
                'dexie',
                'dexie-*',
                'zustand',
                'zustand/*',
                '@dados/*',
                '../dados/*',
                '../../dados/*',
                '../../../dados/*',
                '@plataforma/*',
                '../plataforma/*',
                '../../plataforma/*',
                '../../../plataforma/*',
                '@ui/*',
                '@funcionalidades/*',
                '@app/*',
              ],
              message:
                'src/domain/ é TypeScript puro: sem React, sem Dexie, sem DOM e sem as camadas acima dele (Princípio V, T005).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/domain/ não acessa o DOM (Princípio V).' },
        { name: 'document', message: 'src/domain/ não acessa o DOM (Princípio V).' },
        { name: 'navigator', message: 'src/domain/ não acessa o DOM (Princípio V).' },
        { name: 'localStorage', message: 'src/domain/ não acessa o DOM (Princípio V).' },
        { name: 'indexedDB', message: 'src/domain/ não acessa o banco (Princípio V).' },
        { name: 'crypto', message: 'src/domain/ não gera identificador (FR-124).' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'NewExpression[callee.name="Date"][arguments.length=0]',
          message:
            'Regra de domínio não lê o relógio do sistema: receba o instante como parâmetro (Princípio V).',
        },
        {
          selector: 'CallExpression[callee.object.name="Date"][callee.property.name="now"]',
          message:
            'Regra de domínio não lê o relógio do sistema: receba o instante como parâmetro (Princípio V).',
        },
      ],
    },
  },

  // T006 — FR-124: caminho único de geração de identificador.
  // `crypto.randomUUID()` só pode ser chamado em src/plataforma/id.ts.
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    ignores: ['src/plataforma/id.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'crypto',
          property: 'randomUUID',
          message:
            'FR-124: identificador vem de novoId() em src/plataforma/id.ts. Caminho único, sem fallback (T006).',
        },
      ],
    },
  },

  {
    files: ['src/funcionalidades/**/*.tsx', 'src/app/**/*.tsx', 'src/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  {
    files: ['tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    files: [
      '*.config.{js,ts}',
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'scripts/**/*.{js,mjs,ts}',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
)
