import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Volume2, VolumeX } from "lucide-react";

import { fadeUp } from "@/lib/motion";
import { SectionEyebrow } from "./shared";

const VIDEO_URL = `${import.meta.env.BASE_URL}media/inhabit-device.mp4`;
const POSTER_URL = `${import.meta.env.BASE_URL}media/inhabit-device-poster.jpg`;

export function ShowcaseSection() {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMuted = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    video.muted = next;
    if (!next) {
      // 开声音时从头播，保证完整的观看体验
      video.currentTime = 0;
      void video.play();
    }
    setMuted(next);
  };

  return (
    <motion.section className="scroll-mt-32" {...fadeUp}>
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1fr_auto] md:gap-14">
        <div>
          <SectionEyebrow>{t("sections.showcase.eyebrow")}</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            {t("sections.showcase.title")}
          </h2>
          <p className="mt-2 max-w-md text-pretty text-sm leading-7 text-foreground/75 md:text-[0.975rem] md:leading-8">
            {t("sections.showcase.lead")}
          </p>
          <p className="mt-6 flex items-center gap-2 text-xs leading-6 text-foreground/45">
            <VolumeX className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("sections.showcase.hint")}
          </p>
        </div>

        <div className="relative mx-auto">
          {/* 金色氛围辉光，呼应全局基调 */}
          <div
            className="absolute -inset-8 rounded-[2.5rem] bg-[radial-gradient(closest-side,oklch(0.78_0.12_75/0.18),transparent)] blur-2xl"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-[0_0_60px_-15px_oklch(0.78_0.12_75/0.3)]">
            <video
              ref={videoRef}
              className="h-[420px] w-auto object-cover md:h-[520px]"
              src={VIDEO_URL}
              poster={POSTER_URL}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            />
            <button
              type="button"
              onClick={toggleMuted}
              aria-label={t(muted ? "sections.showcase.unmute" : "sections.showcase.mute")}
              className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white/90 backdrop-blur transition-colors hover:bg-black/65"
            >
              {muted ? (
                <VolumeX className="h-4 w-4" aria-hidden />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
