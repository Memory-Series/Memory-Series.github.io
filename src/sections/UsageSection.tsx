import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/card";
import { fadeUp } from "@/lib/motion";
import { SectionEyebrow } from "./shared";

interface UsageStep {
  title: string;
  items: string[];
}

export function UsageSection() {
  const { t } = useTranslation();
  const steps = t("sections.usage.steps", { returnObjects: true }) as unknown as UsageStep[];

  return (
    <motion.section id="usage" className="scroll-mt-32" {...fadeUp}>
      <SectionEyebrow>{t("sections.usage.eyebrow")}</SectionEyebrow>
      <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
        {t("sections.usage.title")}
      </h2>
      <Card className="mt-4 rounded-3xl border-border/50 bg-card/30 p-5 backdrop-blur md:p-7">
        <div className="space-y-8 text-pretty text-sm leading-7 text-foreground/75 md:text-[0.975rem] md:leading-8">
          <p>{t("sections.usage.lead")}</p>
          <div className="grid grid-cols-1 gap-6 md:gap-8">
            {steps.map((step) => (
              <div key={step.title} className="space-y-3">
                <h3 className="font-[Manrope] text-base font-semibold tracking-[-0.02em] text-foreground md:text-lg">
                  {step.title}
                </h3>
                <ul className="list-disc space-y-1.5 pl-9 marker:text-[oklch(0.78_0.12_75)]">
                  {step.items.map((item) => (
                    <li key={item} className="italic">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </motion.section>
  );
}
