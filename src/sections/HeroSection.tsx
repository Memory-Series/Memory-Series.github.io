import { useState } from "react";
import { motion } from "framer-motion";

import heroBg from "@/assets/hero-bg.jpeg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ease, scrollToAnchor } from "@/lib/motion";

type HeroHubId = "clawhub" | "skillhub";

const HERO_HUB_URLS: Record<HeroHubId, readonly [string, string]> = {
  clawhub: [
    "https://clawhub.ai/evangeliona/memory-trace",
    "https://clawhub.ai/evangeliona/memory-inhabit",
  ],
  skillhub: ["https://skillhub.cn/skills/memory-trace", "https://skillhub.cn/skills/memory-inhabit"],
};

export interface HeroAnchor {
  id: string;
  label: string;
}

interface HeroSectionProps {
  series: string;
  badge: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  contactCta: string;
  primaryAnchor?: string;
  /** Show the Skill source (clawhub / skillhub) link switcher. Skill page only. */
  showHub?: boolean;
  hubHint?: string;
  anchors: readonly HeroAnchor[];
}

export function HeroSection({
  series,
  badge,
  title,
  subtitle,
  primaryCta,
  contactCta,
  primaryAnchor = "intro",
  showHub = false,
  hubHint,
  anchors,
}: HeroSectionProps) {
  const [heroHub, setHeroHub] = useState<HeroHubId>("clawhub");

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full min-h-[42vh] w-full object-cover opacity-[0.72] md:min-h-0" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,oklch(0.145_0.03_262/0.55),oklch(0.145_0.03_262/0.82)_45%,oklch(0.145_0.03_262/0.96))]" />
          <div className="absolute inset-0 grain" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 md:pb-24 md:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/30 px-4 py-2 text-xs tracking-[0.32em] text-foreground/70 backdrop-blur">
              {series}
              <span className="h-1 w-1 rounded-full bg-[oklch(0.78_0.12_75)]" aria-hidden />
              {badge}
            </p>
            <h1
              className={cn(
                "text-balance font-[Manrope] text-4xl font-semibold leading-[1.08] tracking-[-0.02em]",
                "md:text-5xl lg:text-6xl"
              )}
            >
              {title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-8 text-foreground/72 md:text-lg md:leading-8">
              {subtitle}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                onClick={() => scrollToAnchor(primaryAnchor)}
                className={cn(
                  "h-11 rounded-full px-7",
                  "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)]",
                  "hover:bg-[oklch(0.82_0.12_75)]"
                )}
              >
                {primaryCta}
              </Button>
              <Button
                type="button"
                onClick={() => scrollToAnchor("contact")}
                variant="outline"
                className="h-11 rounded-full border-border/60 bg-background/25 px-7 text-foreground backdrop-blur hover:bg-background/35"
              >
                {contactCta}
              </Button>
            </div>

            {showHub && (
              <div className="mx-auto mt-10 w-full max-w-2xl text-left md:max-w-3xl">
                <div className="rounded-2xl border border-border/50 bg-background/15 p-4 backdrop-blur md:rounded-3xl md:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <p className="text-sm text-foreground/65">{hubHint}</p>
                    <div
                      className="inline-flex shrink-0 rounded-full border border-border/60 bg-background/25 p-0.5 backdrop-blur"
                      role="tablist"
                      aria-label="链接来源"
                    >
                      {(["clawhub", "skillhub"] as const).map((id) => (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={heroHub === id}
                          onClick={() => setHeroHub(id)}
                          className={cn(
                            "rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition-colors",
                            heroHub === id
                              ? "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)]"
                              : "text-foreground/70 hover:text-foreground"
                          )}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-border/40 bg-background/35 p-3 md:p-4">
                    <div className="grid gap-2">
                      {HERO_HUB_URLS[heroHub].map((href) => (
                        <a
                          key={href}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "block break-all rounded-lg border border-border/35 bg-background/25 px-3 py-2.5",
                            "font-mono text-[0.6875rem] leading-snug text-foreground/85",
                            "transition-colors hover:border-border/60 hover:bg-background/40",
                            "sm:text-xs"
                          )}
                        >
                          {href}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          <nav className="mx-auto mt-14 flex max-w-3xl flex-wrap justify-center gap-2 md:mt-16" aria-label="页面内导航">
            {anchors.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => scrollToAnchor(a.id)}
                className={cn(
                  "rounded-full border border-border/50 bg-background/20 px-4 py-2 text-xs tracking-[0.2em] text-foreground/70 backdrop-blur",
                  "transition-colors hover:border-border/70 hover:bg-background/30 hover:text-foreground"
                )}
              >
                {a.label}
              </button>
            ))}
          </nav>
        </div>
      </section>

      <div className="h-px max-w-6xl bg-[linear-gradient(to_right,transparent,oklch(0.78_0.12_75/0.35),transparent)]" />
    </>
  );
}
