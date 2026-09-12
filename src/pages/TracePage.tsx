import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ContactSection } from "@/sections/ContactSection";
import { CrossLinkSection } from "@/sections/CrossLinkSection";
import { DemoSection } from "@/sections/DemoSection";
import { HeroSection } from "@/sections/HeroSection";
import { ImplementationSection } from "@/sections/ImplementationSection";
import { IntroSection } from "@/sections/IntroSection";
import { UsageSection } from "@/sections/UsageSection";
import { PRODUCT_ROUTES } from "@/lib/products";

export default function TracePage() {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const anchors = [
    { id: "intro", label: t("nav.anchors.intro") },
    { id: "usage", label: t("nav.anchors.usage") },
    { id: "demo", label: t("nav.anchors.demo") },
    { id: "implementation", label: t("nav.anchors.implementation") },
    { id: "contact", label: t("nav.anchors.contact") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <HeroSection
        series={t("hero.series")}
        badge="Trace / Inhabit"
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        primaryCta={t("hero.primaryCta")}
        contactCta={t("hero.contactCta")}
        primaryAnchor="intro"
        showHub
        hubHint={t("hero.hubHint")}
        anchors={anchors}
      />

      <main className="mx-auto max-w-3xl space-y-20 px-5 py-16 md:space-y-28 md:py-24">
        <IntroSection />
        <UsageSection />
      </main>

      <DemoSection variant="skill" />

      <main className="mx-auto max-w-3xl space-y-20 px-5 py-16 md:space-y-28 md:py-24">
        <ImplementationSection />
        <CrossLinkSection
          to={PRODUCT_ROUTES.device}
          eyebrowKey="bridge.toDevice.eyebrow"
          titleKey="bridge.toDevice.title"
          descKey="bridge.toDevice.desc"
          ctaKey="bridge.toDevice.cta"
        />
        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  );
}
