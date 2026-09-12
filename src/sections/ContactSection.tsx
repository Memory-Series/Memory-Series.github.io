import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import wechatOfficialQr from "@/assets/demo/other/gongzhonghao.jpeg";
import { Card } from "@/components/ui/card";
import { fadeUp } from "@/lib/motion";
import { SectionEyebrow } from "./shared";

export function ContactSection() {
  const { t } = useTranslation();

  return (
    <motion.section id="contact" className="scroll-mt-32" {...fadeUp}>
      <SectionEyebrow>{t("sections.contact.eyebrow")}</SectionEyebrow>
      <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
        {t("sections.contact.title")}
      </h2>
      <Card className="mt-4 rounded-3xl border-border/50 bg-card/30 p-8 backdrop-blur md:p-10">
        <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
          <img
            src={wechatOfficialQr}
            alt="微信公众号二维码"
            className="h-24 w-24 rounded-xl border border-border/50 object-cover"
          />
          <div className="space-y-1 text-sm leading-7 text-foreground/65">
            <a href="mailto:mlx979692038@gmail.com" className="underline-offset-4 hover:text-foreground/80 hover:underline">
              GMAIL邮箱：mlx979692038@gmail.com
            </a>
            <a href="mailto:evange563@foxmail.com" className="block underline-offset-4 hover:text-foreground/80 hover:underline">
              FOXMAIL邮箱：evange563@foxmail.com
            </a>
          </div>
        </div>
      </Card>
    </motion.section>
  );
}
