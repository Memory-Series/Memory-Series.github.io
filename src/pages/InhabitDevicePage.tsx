import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ContactSection } from "@/sections/ContactSection";
import { CrossLinkSection } from "@/sections/CrossLinkSection";
import { DemoSection } from "@/sections/DemoSection";
import { DeviceAssetsSection } from "@/sections/DeviceAssetsSection";
import { FlashDeployRow } from "@/sections/FlashDeployRow";
import { HeroSection } from "@/sections/HeroSection";
import { SetupSection } from "@/sections/SetupSection";
import { ShowcaseSection } from "@/sections/ShowcaseSection";
import { PRODUCT_ROUTES } from "@/lib/products";

export default function InhabitDevicePage() {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const anchors = [
    { id: "setup", label: t("nav.anchors.setup") },
    { id: "flash", label: t("nav.anchors.flash") },
    { id: "assets", label: t("nav.anchors.assets") },
    { id: "deploy", label: t("nav.anchors.deploy") },
    { id: "demo", label: t("nav.anchors.demo") },
    { id: "contact", label: t("nav.anchors.contact") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <HeroSection
        series={t("device.hero.series")}
        badge={t("device.hero.badge")}
        title={t("device.hero.title")}
        subtitle={t("device.hero.subtitle")}
        primaryCta={t("device.hero.primaryCta")}
        contactCta={t("hero.contactCta")}
        primaryAnchor="setup"
        anchors={anchors}
      />

      <main className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="space-y-20 md:space-y-28">
          <ShowcaseSection />
          <SetupSection />
        </div>

        <div className="mt-20 md:mt-28">
          <DeviceAssetsSection />
        </div>
      </main>

      <FlashDeployRow />

      <DemoSection variant="device" />

      <main className="mx-auto max-w-3xl space-y-20 px-5 py-16 md:space-y-28 md:py-24">
        <CrossLinkSection
          to={PRODUCT_ROUTES.trace}
          eyebrowKey="bridge.toSkill.eyebrow"
          titleKey="bridge.toSkill.title"
          descKey="bridge.toSkill.desc"
          ctaKey="bridge.toSkill.cta"
        />
        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  );
}
