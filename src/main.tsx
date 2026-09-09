import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './i18n'
import en from './locales/en.json'
import zh from './locales/zh.json'
import { assertLocalesAtBoot } from './lib/schemas'

// data-001: dev-time locale schema assertion.
// Logs warnings (no throw) if either locale file fails the zod schema
// or if zh/en leaf keys drift out of sync.
if (import.meta.env.DEV) {
  assertLocalesAtBoot(zh, en)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)