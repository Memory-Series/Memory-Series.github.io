import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `.workbuddy` holds local tooling and scratch copies (gitignored). It can contain
  // .ts/.tsx files — a throwaway clone under it once made `npm run lint` fail on
  // duplicated source that CI never sees. Keep it out of lint entirely.
  globalIgnores(['dist', '.workbuddy']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/contexts/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    // chat-002 —— 服务端（`server/**`）与部署脚本是 node 侧 ESM。
    // 上面那段只覆盖 `**/*.{ts,tsx}`，这些 `.mjs` 此前**完全不在 lint 范围内**：
    // 服务端刻意不加编译步骤（零依赖、node 直接跑），于是"用了没定义的变量"
    // 这类错误只能靠 lint 和测试兜，缺了 lint 就只剩测试 —— 而测试不覆盖的分支
    // 正是最容易写错的地方。
    files: ['server/**/*.mjs', 'scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
  },
])
