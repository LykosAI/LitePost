import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'docs/.vitepress/cache',
      'docs/.vitepress/dist',
      'src-tauri/target',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // The gate this config exists for: an early return above a hook silently
      // reset ResponsePanel's state (see the comment in ResponsePanel.tsx).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // tsc already enforces noUnusedLocals/noUnusedParameters, and it
      // understands the `_`-prefix convention better than the lint rule.
      '@typescript-eslint/no-unused-vars': 'off',

      // Pre-existing `any`s in the script runner and persistence layers are
      // deliberate (user scripts, JSON round-trips). Flagged, but not a gate.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['src/test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
