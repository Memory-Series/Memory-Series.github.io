import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

import { cn } from "@/lib/utils";
import { PRODUCT_ROUTES } from "@/lib/products";
import { persistLng } from "@/lib/i18n-storage";

const PRODUCT_SWITCHES = [
  { route: PRODUCT_ROUTES.trace, labelKey: "productSwitch.skill" },
  { route: PRODUCT_ROUTES.device, labelKey: "productSwitch.device" },
] as const;

export function SiteHeader() {
  const { t, i18n } = useTranslation();
  const [location, navigate] = useLocation();
  const isChineseLanguage = (i18n.resolvedLanguage ?? i18n.language).startsWith("zh");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5">
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 text-sm tracking-wide text-foreground/75 transition-colors hover:text-foreground"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ArrowUp className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t("header.backToTop")}</span>
        </button>

        <div
          className="inline-flex shrink-0 rounded-full border border-border/60 bg-background/40 p-0.5 backdrop-blur"
          role="tablist"
          aria-label={t("productSwitch.aria")}
        >
          {PRODUCT_SWITCHES.map(({ route, labelKey }) => (
            <button
              key={route}
              type="button"
              role="tab"
              aria-selected={location === route}
              onClick={() => navigate(route)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium tracking-wide transition-colors sm:px-4",
                location === route
                  ? "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)]"
                  : "text-foreground/65 hover:text-foreground"
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="inline-flex h-9 min-w-12 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/65 px-3 text-sm font-medium tracking-wide text-foreground/85 transition-colors hover:bg-background/80 hover:text-foreground"
          onClick={() => {
            const next: "en" | "zh" = isChineseLanguage ? "en" : "zh";
            persistLng(next);
            void i18n.changeLanguage(next);
          }}
          aria-label="语言切换按钮"
          aria-pressed={isChineseLanguage}
        >
          {isChineseLanguage ? "EN" : "中"}
        </button>
      </div>
    </header>
  );
}
