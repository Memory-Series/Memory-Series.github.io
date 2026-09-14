import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './i18n'
import en from './locales/en.json'
import zh from './locales/zh.json'

// data-001: dev-time locale schema assertion.
// Logs warnings (no throw) if either locale file fails the zod schema
// or if zh/en leaf keys drift out of sync.
//
// perf-003: this is a *dynamic* import on purpose. `import.meta.env.DEV` is
// replaced with `false` in production, so the whole branch — and with it the
// lazily loaded zod — is dropped from the build. A static import here would
// pull ~59 kB of zod into the production main chunk.
if (import.meta.env.DEV) {
  void import('./lib/locale-schema')
    .then((m) => m.assertLocalesAtBoot(zh, en))
    .catch((err) => console.error('[locale schema] failed to load', err))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
