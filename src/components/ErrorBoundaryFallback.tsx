import * as React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface DegradedFallbackProps {
  onRetry: () => void;
  onReload: () => void;
}

/**
 * Visual fallback rendered by ErrorBoundary when a section crashes.
 *
 * Uses existing design tokens (deep-space void background + warm-gold border)
 * and the shadcn Button so the degraded UI stays visually consistent with
 * the rest of the site without introducing new colors or layout primitives.
 *
 * Lives in its own file so ErrorBoundary.tsx only exports the class
 * component (react-refresh/only-export-components).
 */
export default function DegradedFallback({
  onRetry,
  onReload,
}: DegradedFallbackProps) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-2xl border border-[oklch(0.78_0.12_75)]/55 bg-[oklch(0.16_0.03_262)]/40 p-5 text-foreground"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[oklch(0.78_0.12_75)]/70 text-[oklch(0.78_0.12_75)]"
        >
          !
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-[Manrope] text-sm font-semibold text-[oklch(0.95_0.01_240)]">
            {t("errorBoundary.degraded.title")}
          </p>
          <p className="mt-1 text-xs leading-6 text-foreground/70">
            {t("errorBoundary.degraded.body")}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={onRetry}>
              {t("errorBoundary.degraded.retry")}
            </Button>
            <Button size="sm" variant="ghost" onClick={onReload}>
              {t("errorBoundary.degraded.reload")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
