import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/card";
import { fadeUp } from "@/lib/motion";
import { SectionEyebrow } from "./shared";

export function IntroSection() {
  const { t } = useTranslation();

  return (
    <motion.section id="intro" className="scroll-mt-32" {...fadeUp}>
      <SectionEyebrow>{t("sections.intro.eyebrow")}</SectionEyebrow>
      <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
        {t("sections.intro.title")}
      </h2>
      <Card className="mt-4 rounded-3xl border-border/50 bg-card/30 p-5 backdrop-blur md:p-7">
        <div className="space-y-8 text-pretty text-sm leading-7 text-foreground/75 md:text-[0.975rem] md:leading-8">
          <div className="grid grid-cols-1 gap-6 md:gap-8">
            <div className="space-y-3">
              <h3 className="font-[Manrope] text-base font-semibold tracking-[-0.02em] text-foreground md:text-lg">
                Trace · 寻迹
              </h3>
              <ul className="list-disc space-y-1.5 pl-9 marker:text-[oklch(0.78_0.12_75)]">
                <li className="italic">{t("sections.intro.traceBullets.0")}</li>
                <li className="italic">{t("sections.intro.traceBullets.1")}</li>
                <li className="italic">{t("sections.intro.traceBullets.2")}</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-[Manrope] text-base font-semibold tracking-[-0.02em] text-foreground md:text-lg">
                Inhabit · 入心
              </h3>
              <ul className="list-disc space-y-1.5 pl-9 marker:text-[oklch(0.78_0.12_75)]">
                <li className="italic">{t("sections.intro.inhabitBullets.0")}</li>
                <li className="italic">{t("sections.intro.inhabitBullets.1")}</li>
                <li className="italic">{t("sections.intro.inhabitBullets.2")}</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </motion.section>
  );
}
