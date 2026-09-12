import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import ErrorBoundary from "@/components/ErrorBoundary";
import { FirmwareFlash } from "@/components/FirmwareFlash";
import { CharacterDeploy } from "@/components/CharacterDeploy";
import { fadeUp } from "@/lib/motion";
import { SectionEyebrow } from "./shared";

/** Two-column hardware operations row: firmware flashing (primary) + character deploy. */
export function FlashDeployRow() {
  const { t } = useTranslation();

  return (
    <section className="px-5">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-6">
          <motion.section id="flash" className="scroll-mt-32" {...fadeUp}>
            <SectionEyebrow>{t("sections.flash.eyebrowFlash")}</SectionEyebrow>
            <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
              {t("sections.flash.sectionFlash")}
            </h2>
            <p className="mt-2 text-pretty text-sm leading-7 text-foreground/75 md:text-[0.975rem] md:leading-8">
              {t("sections.flash.lead")}
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs tracking-[0.2em] text-foreground/55">
              <span className="h-1 w-1 rounded-full bg-[oklch(0.78_0.12_75)]" aria-hidden />
              {t("sections.flash.sectionFlashDesc")}
            </p>
            <div className="mt-4">
              <ErrorBoundary name="firmware-flash">
                <FirmwareFlash />
              </ErrorBoundary>
            </div>
          </motion.section>

          <motion.section id="deploy" className="scroll-mt-32" {...fadeUp}>
            <SectionEyebrow>{t("sections.flash.eyebrowDeploy")}</SectionEyebrow>
            <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
              {t("sections.flash.sectionDeploy")}
            </h2>
            <p className="mt-2 text-pretty text-sm leading-7 text-foreground/75 md:text-[0.975rem] md:leading-8">
              {t("sections.flash.supportHint")}
            </p>
            <div className="mt-4">
              <ErrorBoundary name="character-deploy">
                <CharacterDeploy />
              </ErrorBoundary>
            </div>
          </motion.section>
        </div>
      </div>
    </section>
  );
}
