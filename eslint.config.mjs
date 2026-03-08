import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginNext from '@next/eslint-plugin-next'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import configPrettier from 'eslint-config-prettier'

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/migrations/**',
      '**/.turbo/**',
      '**/next-env.d.ts',
    ],
  },

  // Base JS + TS rules for all packages
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Next.js + React hooks rules scoped to the dashboard only
  {
    files: ['apps/dashboard/**/*.{ts,tsx}'],
    plugins: {
      '@next/next': pluginNext,
      'react-hooks': pluginReactHooks,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
      ...pluginReactHooks.configs.recommended.rules,
      '@next/next/no-html-link-for-pages': ['error', 'apps/dashboard/app'],
    },
  },

  // Disable ESLint formatting rules that conflict with Prettier
  configPrettier,

  // Global rule overrides
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='require']",
          message: 'Use ES6 import/export syntax instead of CommonJS require.',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
)
