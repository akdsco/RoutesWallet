import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

// Flat config. Type-aware linting on src; the config/build files stay untyped.
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'scripts'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Vitest globals live in the test files.
  {
    files: ['src/**/*.test.{ts,tsx}'],
    languageOptions: { globals: globals.node },
  },
  // E2E harness + build config: Node-side files outside `src`. Lint them too so
  // the test platform's own tooling isn't the one unchecked corner (non
  // type-checked config — they're typechecked via tsconfig.e2e.json instead).
  {
    files: ['e2e/**/*.ts', 'playwright.config.ts', 'vite.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  }
);
