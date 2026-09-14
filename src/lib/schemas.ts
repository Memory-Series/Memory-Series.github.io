/**
 * Framework-free helpers for locale drift detection (data-001).
 *
 * This module intentionally has **zero dependencies** so it can be imported
 * from anywhere — including the production bundle — at no cost.
 *
 * The zod-backed schema used to live here with a top-level `import { z } from
 * "zod"`. Because `src/main.tsx` imported it statically, zod ended up in the
 * production main chunk (~59 kB) even though the only call site was wrapped in
 * `if (import.meta.env.DEV)` — a static import cannot be dead-code-eliminated.
 * The zod path now lives in `src/lib/locale-schema.ts` and is loaded lazily.
 * See `harness/feature_list.json` → perf-003.
 */

export interface LocaleValidationIssue {
  lang: "zh" | "en";
  path: string;
  message: string;
}

/**
 * Compare the leaf key sets of zh and en. Mismatches are flagged even when
 * each side parses successfully on its own (e.g. typo'd translation key).
 */
export function findLocaleKeyDrift(zh: unknown, en: unknown): string[] {
  const keys = collectLeafKeys(zh);
  const enKeys = collectLeafKeys(en);
  const missingInEn: string[] = [];
  for (const k of keys) {
    if (!enKeys.has(k)) missingInEn.push(k);
  }
  const missingInZh: string[] = [];
  for (const k of enKeys) {
    if (!keys.has(k)) missingInZh.push(k);
  }
  return [...missingInEn.map((k) => `zh-only: ${k}`), ...missingInZh.map((k) => `en-only: ${k}`)];
}

function collectLeafKeys(value: unknown, prefix = ""): Set<string> {
  const out = new Set<string>();
  if (value === null || typeof value !== "object") {
    out.add(prefix);
    return out;
  }
  if (Array.isArray(value)) {
    out.add(prefix || "(root)");
    return out;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${k}` : k;
    const child = collectLeafKeys(v, next);
    for (const ck of child) out.add(ck);
  }
  return out;
}
