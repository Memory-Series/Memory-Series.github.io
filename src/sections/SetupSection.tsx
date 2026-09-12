import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";
import { SectionEyebrow } from "./shared";

const STEP_KEYS = ["step1", "step2", "step3", "step4"] as const;

export function SetupSection() {
  const { t } = useTranslation();

  return (
    <motion.section id="setup" className="scroll-mt-32" {...fadeUp}>
      <SectionEyebrow>{t("sections.setup.eyebrow")}</SectionEyebrow>
      <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
        {t("sections.setup.title")}
      </h2>
      <p className="mt-2 text-pretty text-sm leading-7 text-foreground/75 md:text-[0.975rem] md:leading-8">
        {t("sections.setup.lead")}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STEP_KEYS.map((key, idx) => (
          <div
            key={key}
            className="relative rounded-2xl border border-border/50 bg-card/30 p-5 backdrop-blur"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  "border border-[oklch(0.78_0.12_75/0.45)] bg-[oklch(0.78_0.12_75/0.12)]",
                  "font-[Manrope] text-xs font-semibold text-[oklch(0.78_0.12_75)]"
                )}
                aria-hidden
              >
                {idx + 1}
              </span>
              <h3 className="font-[Manrope] text-base font-semibold tracking-[-0.02em] text-foreground">
                {t(`sections.flash.${key}`)}
              </h3>
            </div>
            <p className="mt-2.5 text-pretty text-sm leading-7 text-foreground/70">
              {t(`sections.flash.${key}Desc`)}
            </p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
