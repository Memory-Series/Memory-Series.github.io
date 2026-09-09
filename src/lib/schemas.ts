/**
 * Runtime schemas for the locale files (src/locales/*.json) and the
 * product catalog (src/lib/products.ts).
 *
 * data-001: surfaces missing keys, type mismatches, and zh/en drift
 * during development. The validation runs once at module load and at
 * a separate `npm run lint:locales` gate (see package.json).
 *
 * Why zod? Already a dependency via @hookform/resolvers + react-hook-form;
 * reuses the existing API surface and gives us a single source of truth
 * for both runtime validation (dev assertions) and editor IntelliSense.
 */
import { z } from "zod";

const UsageStepSchema = z.object({
  title: z.string(),
  items: z.array(z.string()),
});

const LocaleSchema = z.object({
  header: z.object({
    backToTop: z.string(),
  }),
  hero: z.object({
    series: z.string(),
    title: z.string(),
    subtitle: z.string(),
    primaryCta: z.string(),
    contactCta: z.string(),
    hubHint: z.string(),
  }),
  nav: z.object({
    anchors: z.object({
      intro: z.string(),
      usage: z.string(),
      demo: z.string(),
      implementation: z.string(),
      contact: z.string(),
      flash: z.string(),
    }),
  }),
  sections: z.object({
    intro: z.object({
      eyebrow: z.string(),
      title: z.string(),
      traceBullets: z.array(z.string()),
      inhabitBullets: z.array(z.string()),
    }),
    demo: z.object({
      eyebrow: z.string(),
      title: z.string(),
    }),
    usage: z.object({
      eyebrow: z.string(),
      title: z.string(),
      lead: z.string(),
      steps: z.array(UsageStepSchema),
    }),
    implementation: z.object({
      eyebrow: z.string(),
      title: z.string(),
    }),
    contact: z.object({
      eyebrow: z.string(),
      title: z.string(),
    }),
    // flash is intentionally loose: it has 40+ keys (Wizards, deploy, status,
    // etc.) and the section grows with each device-related feature. We only
    // require the keys the page actually reads at the top of the section.
    flash: z
      .object({
        eyebrow: z.string(),
        title: z.string(),
        sectionFlash: z.string().optional(),
        sectionFlashBadge: z.string().optional(),
        sectionFlashDesc: z.string().optional(),
        sectionDeploy: z.string().optional(),
        eyebrowFlash: z.string().optional(),
        eyebrowDeploy: z.string().optional(),
      })
      .passthrough(),
  }),
  footer: z.object({
    links: z.object({
      privacy: z.string(),
      terms: z.string(),
      contact: z.string(),
    }),
  }),
  errorBoundary: z.object({
    degraded: z.object({
      title: z.string(),
      body: z.string(),
      retry: z.string(),
      reload: z.string(),
    }),
  }),
});

export type LocaleShape = z.infer<typeof LocaleSchema>;

const ProductInfoSchema = z.object({
  key: z.enum(["soulpod", "verse", "trace", "sculpt", "fluffydiary"]),
  name: z.string(),
  cnName: z.string(),
  shortLine: z.string(),
  heroTitle: z.string(),
  heroSubtitle: z.string(),
  ctaPrimary: z.string(),
  ctaSecondary: z.string(),
  definitionTitle: z.string(),
  definitionBody: z.string(),
  valueTitle: z.string(),
  valueBullets: z.array(z.object({ title: z.string(), body: z.string() })),
  experienceTitle: z.string(),
  experienceBody: z.string(),
  techTitle: z.string(),
  techBody: z.string(),
  scenariosTitle: z.string(),
  scenarios: z.array(z.object({ title: z.string(), body: z.string() })),
  closing: z.string(),
  oneLiner: z.string(),
});

// Re-exported so callers can opt into using the zod schema for runtime
// validation if/when needed (the boot assertion only uses LocaleSchema).
export { ProductInfoSchema as _ProductInfoSchema };
export type ProductInfoShape = z.infer<typeof ProductInfoSchema>;

export interface LocaleValidationIssue {
  lang: "zh" | "en";
  path: string;
  message: string;
}

/**
 * Validate both locale files. Returns a flat list of issues (empty = OK).
 * Used by both the dev-time assertion and the `npm run lint:locales` script.
 */
export function validateLocales(zh: unknown, en: unknown): LocaleValidationIssue[] {
  const issues: LocaleValidationIssue[] = [];
  const zhResult = LocaleSchema.safeParse(zh);
  if (!zhResult.success) {
    for (const issue of zhResult.error.issues) {
      issues.push({
        lang: "zh",
        path: issue.path.join("."),
        message: issue.message,
      });
    }
  }
  const enResult = LocaleSchema.safeParse(en);
  if (!enResult.success) {
    for (const issue of enResult.error.issues) {
      issues.push({
        lang: "en",
        path: issue.path.join("."),
        message: issue.message,
      });
    }
  }
  return issues;
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

/**
 * Dev-time assertion: warns in console but does not throw.
 * Called once from src/main.tsx; safe to keep as a no-op in production.
 */
export function assertLocalesAtBoot(zh: unknown, en: unknown): void {
  if (typeof window === "undefined" && typeof process === "undefined") return;
  const issues = validateLocales(zh, en);
  const drift = findLocaleKeyDrift(zh, en);
  if (issues.length === 0 && drift.length === 0) return;
  console.groupCollapsed(
    `%c[locale schema] ${issues.length + drift.length} issue(s)`,
    "color:#d4a853;font-weight:600",
  );
  for (const i of issues) {
    console.warn(`  ${i.lang} ${i.path} — ${i.message}`);
  }
  for (const d of drift) {
    console.warn(`  ${d}`);
  }
  console.groupEnd();
}