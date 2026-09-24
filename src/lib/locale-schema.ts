/**
 * zod-backed runtime schemas for the locale files (src/locales/*.json) and the
 * product catalog (src/lib/products.ts).
 *
 * data-001: surfaces missing keys, type mismatches, and zh/en drift during
 * development. The validation runs once at module load in dev and at a
 * separate `npm run lint:locales` gate (see package.json).
 *
 * perf-003: zod is **never** imported statically. It is pulled in with
 * `await import("zod")` the first time a schema is actually needed, and the
 * built schemas are cached. The only caller (`src/main.tsx`) sits behind
 * `if (import.meta.env.DEV)`, so in a production build the whole branch —
 * including this module and zod itself — is dead-code-eliminated.
 *
 * Why zod at all? It is already a dependency via @hookform/resolvers +
 * react-hook-form; reusing it keeps one source of truth for runtime validation
 * and editor IntelliSense, at zero production cost.
 */
import { findLocaleKeyDrift, type LocaleValidationIssue } from "./schemas";
import type { z as ZodNamespace } from "zod";

type ZodModule = typeof import("zod");

/**
 * Build the schemas from a zod module instance. Kept synchronous and pure so
 * the exported `z.infer` types below can be derived from its return type.
 */
function buildSchemas(zod: ZodModule) {
  const z = zod.z;

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
      // chat-001: only the main-bundle launch button's two keys live here. The
      // drawer's own copy — short labels as well as the notice/terms prose —
      // is in src/lib/chat-copy.ts so it ships with the lazy drawer chunk.
      chat: z
        .object({
          launch: z.string(),
          launchAria: z.string(),
        })
        .passthrough(),
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

  return { LocaleSchema, ProductInfoSchema };
}

type Schemas = ReturnType<typeof buildSchemas>;

export type LocaleShape = ZodNamespace.infer<Schemas["LocaleSchema"]>;
export type ProductInfoShape = ZodNamespace.infer<Schemas["ProductInfoSchema"]>;

let cache: Schemas | null = null;

/**
 * Load zod on demand and build the schemas once. Every public function in this
 * module goes through here, so nothing on the zod path is ever evaluated
 * synchronously at module scope.
 */
async function getSchemas(): Promise<Schemas> {
  if (!cache) {
    const zod = await import("zod");
    cache = buildSchemas(zod);
  }
  return cache;
}

/**
 * Opt-in accessor for the product catalog schema (previously exported as
 * `_ProductInfoSchema`). Async because zod is loaded lazily.
 */
export async function getProductInfoSchema(): Promise<Schemas["ProductInfoSchema"]> {
  return (await getSchemas()).ProductInfoSchema;
}

/**
 * Validate both locale files. Returns a flat list of issues (empty = OK).
 */
export async function validateLocales(zh: unknown, en: unknown): Promise<LocaleValidationIssue[]> {
  const { LocaleSchema } = await getSchemas();
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
 * Dev-time assertion: warns in console but does not throw.
 * Called once from src/main.tsx; safe to keep as a no-op in production.
 */
export async function assertLocalesAtBoot(zh: unknown, en: unknown): Promise<void> {
  if (typeof window === "undefined" && typeof process === "undefined") return;
  const issues = await validateLocales(zh, en);
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
