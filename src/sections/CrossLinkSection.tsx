import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";

interface CrossLinkSectionProps {
  /** Hash route of the other product page. */
  to: string;
  eyebrowKey: string;
  titleKey: string;
  descKey: string;
  ctaKey: string;
}

export function CrossLinkSection({ to, eyebrowKey, titleKey, descKey, ctaKey }: CrossLinkSectionProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <motion.section className="scroll-mt-32" {...fadeUp}>
      <Card
        role="link"
        tabIndex={0}
        onClick={() => navigate(to)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigate(to);
          }
        }}
        className={cn(
          "group cursor-pointer rounded-3xl border-border/50 bg-card/30 p-6 backdrop-blur transition-colors md:p-8",
          "hover:border-[oklch(0.78_0.12_75/0.45)] hover:bg-card/40 focus:outline-none focus-visible:border-[oklch(0.78_0.12_75/0.6)]"
        )}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs tracking-[0.34em] text-foreground/55">{t(eyebrowKey)}</p>
            <h2 className="font-[Manrope] text-xl font-semibold tracking-[-0.02em] text-foreground md:text-2xl">
              {t(titleKey)}
            </h2>
            <p className="text-pretty text-sm leading-7 text-foreground/70">{t(descKey)}</p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border/60 bg-background/25 px-4 py-2",
              "text-sm text-foreground/80 transition-colors group-hover:border-[oklch(0.78_0.12_75/0.5)] group-hover:text-foreground md:self-auto"
            )}
          >
            {t(ctaKey)}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </Card>
    </motion.section>
  );
}
