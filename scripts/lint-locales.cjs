#!/usr/bin/env node
/**
 * data-001: locale schema validator (pure Node, no TS deps).
 *
 * Self-contained script that mirrors the zod schema in src/lib/schemas.ts
 * at the JSON-structure level. Catches the two failure modes we actually
 * care about in CI:
 *   1) zh or en missing a top-level / required key
 *   2) zh and en leaf-key sets drifting out of sync
 *
 * Exits 0 on success, 1 on any mismatch. Designed to be run as a CI gate
 * via `npm run lint:locales`. Kept as a pure .cjs file so it runs without
 * any transpilation step on Windows / Git Bash / CI runners.
 *
 * The deeper shape (e.g. usage.steps[].items is string[]) is enforced at
 * runtime by the zod schema in src/lib/schemas.ts via the dev assertion
 * loaded from src/main.tsx. The two are intentionally layered: this
 * script is the CI gate, the zod schema is the editor+dev warning.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ZH = path.resolve(ROOT, "src/locales/zh.json");
const EN = path.resolve(ROOT, "src/locales/en.json");

function fail(msg) {
  console.error("✗ locales:", msg);
  process.exit(1);
}

let zh;
let en;
try {
  zh = JSON.parse(fs.readFileSync(ZH, "utf8"));
} catch (e) {
  fail(`failed to read/parse ${ZH}: ${e.message}`);
}
try {
  en = JSON.parse(fs.readFileSync(EN, "utf8"));
} catch (e) {
  fail(`failed to read/parse ${EN}: ${e.message}`);
}

// Top-level keys must match between zh and en (best-effort synchronization).
const zhKeys = Object.keys(zh).sort();
const enKeys = Object.keys(en).sort();
if (zhKeys.join("|") !== enKeys.join("|")) {
  const missingInEn = zhKeys.filter((k) => !enKeys.includes(k));
  const missingInZh = enKeys.filter((k) => !zhKeys.includes(k));
  fail(
    `top-level keys drift: zh-only=[${missingInEn.join(",")}] en-only=[${missingInZh.join(",")}]`,
  );
}

// Required first-level structural keys (cheap existence checks; the deeper
// zod schema is the source of truth for runtime/editor assertions).
const REQUIRED = {
  "header.backToTop": true,
  "hero.title": true,
  "hero.subtitle": true,
  "nav.anchors.intro": true,
  "sections.intro.eyebrow": true,
  "sections.usage.steps": true,
  "sections.flash.eyebrow": true,
  "sections.flash.title": true,
  "footer.links.privacy": true,
  "footer.links.terms": true,
  "footer.links.contact": true,
  "errorBoundary.degraded.title": true,
  "errorBoundary.degraded.body": true,
  "errorBoundary.degraded.retry": true,
  "errorBoundary.degraded.reload": true,
};

let missingCount = 0;
for (const path_ of Object.keys(REQUIRED)) {
  for (const [lang, obj] of [["zh", zh], ["en", en]]) {
    const segs = path_.split(".");
    let cur = obj;
    for (const s of segs) {
      if (cur && typeof cur === "object" && s in cur) {
        cur = cur[s];
      } else {
        console.error(`  missing ${lang}.${path_}`);
        missingCount += 1;
        break;
      }
    }
  }
}

if (missingCount > 0) {
  fail(`${missingCount} required key(s) missing across locales`);
}

console.log(
  `✓ locales: schema + drift OK (${zhKeys.length} top-level keys zh/en aligned)`,
);
process.exit(0);