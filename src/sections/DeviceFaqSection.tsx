import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DEVICE_FAQ_ITEMS } from "@/lib/device-faq";
import { fadeUp } from "@/lib/motion";
import { SectionEyebrow } from "./shared";

/** device-spec-001: 硬件页 FAQ 排障区块。 */
export function DeviceFaqSection() {
  const { t } = useTranslation();

  return (
    <motion.section id="faq" className="scroll-mt-32 px-5" {...fadeUp}>
      <div className="mx-auto max-w-6xl">
        <SectionEyebrow>{t("sections.faq.eyebrow")}</SectionEyebrow>
        <h2 className="mt-3 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
          {t("sections.faq.title")}
        </h2>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-7 text-foreground/75 md:text-[0.975rem] md:leading-8">
          {t("sections.faq.lead")}
        </p>

        <Accordion type="single" collapsible className="mt-6">
          {DEVICE_FAQ_ITEMS.map((item, index) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className="border-border/50 first:border-t first:border-border/50"
          >
            <AccordionTrigger className="py-5 text-[0.975rem] leading-7 text-foreground/90 hover:no-underline">
              <span className="flex items-baseline gap-3 pr-2">
                <span className="font-mono text-xs tracking-[0.18em] text-[oklch(0.78_0.12_75)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{t(`sections.faq.items.${item.id}.q`)}</span>
              </span>
            </AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-3 pb-2 pl-8">
                  {Array.from({ length: item.stepCount }, (_, i) => (
                    <li
                      key={i}
                      className="relative text-pretty text-sm leading-7 text-foreground/70 before:absolute before:-left-4 before:top-[0.85em] before:h-1 before:w-1 before:rounded-full before:bg-foreground/30"
                    >
                      {t(`sections.faq.items.${item.id}.step${i + 1}`)}
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </motion.section>
  );
}
