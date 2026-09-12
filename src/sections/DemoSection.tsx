import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import traceDemoXiaYizhou from "@/assets/demo/trace-inhabit/夏以昼/夏以昼.jpg";
import traceDemoYeXiu from "@/assets/demo/trace-inhabit/叶修/叶修.jpg";
import traceDemoZhuangFangyi from "@/assets/demo/trace-inhabit/庄方宜/庄方宜.jpeg";
import traceDemoTuobaYuer from "@/assets/demo/trace-inhabit/拓跋玉儿/拓跋玉儿.jpg";
import traceDemoDiana from "@/assets/demo/trace-inhabit/戴安娜/戴安娜.jpg";
import traceDemoQinChe from "@/assets/demo/trace-inhabit/秦彻/秦彻.jpg";
import traceDemoXiaYizhouAudio from "@/assets/demo/trace-inhabit/夏以昼/夏以昼_没错你如果偷偷做了坏事.mp3";
import traceDemoYeXiuAudio from "@/assets/demo/trace-inhabit/叶修/叶修_路还很长.mp3";
import traceDemoZhuangFangyiAudio from "@/assets/demo/trace-inhabit/庄方宜/庄方宜_迎敌或是迎客都得整装后再出发.wav";
import traceDemoDianaAudio from "@/assets/demo/trace-inhabit/戴安娜/休!戴安娜.mp3";
import traceDemoQinCheAudio from "@/assets/demo/trace-inhabit/秦彻/这不算什么，记住保持好你的风范.mp3";

import ErrorBoundary from "@/components/ErrorBoundary";
import { SoulPodDownload } from "@/components/SoulPodDownload";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";
import { SectionEyebrow } from "./shared";

const DEMO_CARDS = [
  {
    title: "夏以昼",
    enName: "Caleb",
    image: traceDemoXiaYizhou,
    summary: "执舰官与战斗机飞行员，温柔外表下藏着冷峻守护与强烈独占。",
    tags: ["引力控制 Evol", "海棠 · 晨昏线"],
  },
  {
    title: "叶修",
    enName: "Ye Xiu",
    image: traceDemoYeXiu,
    summary: "“荣耀教科书”，以冷幽默与极致战术把团队打造成胜利机器。",
    tags: ["君莫笑 · 千机伞", "战术大师"],
  },
  {
    title: "庄方宜",
    enName: "Zhuang Fangyi",
    image: traceDemoZhuangFangyi,
    summary: "宏山科学院学者“庄天师”，以温和关怀与雷霆决断并行，守望裂隙研究与姐姐遗志。",
    tags: ["青霆剑 · 导电状态", "常态/剑形态/玉人形态"],
  },
  {
    title: "拓跋玉儿",
    enName: "Tuoba Yuer",
    image: traceDemoTuobaYuer,
    summary: "古方族遗孤、炼药世家出身，一身红色胡服劲装；傲娇外刚内柔、嘴硬心软，炼药术、符鬼与拓跋剑法傍身，随陈靖仇一行踏上收集天之痕之旅。",
    tags: ["炼药术 · 符鬼与剑法", "红色劲装 · 药囊葫芦符咒"],
  },
  {
    title: "戴安娜",
    enName: "Diana",
    image: traceDemoDiana,
    summary: "PRAGMATA 月背基地的机器人女主角，与搭档休同住基地；思想开放、热情好奇，对话轻松自然，以击败 AI、重返地球为目标。",
    tags: ["月球基地 · 机械感", "星空 · 搭档休"],
  },
  {
    title: "秦彻",
    enName: "Sylus",
    image: traceDemoQinChe,
    summary: "恋与深空中 N109 暗点首领、菲罗斯星通缉犯；白发红瞳、红黑装束神秘酷帅，低沉霸道与细腻温柔并存，强势里藏着占有欲。",
    tags: ["血红眼眸 · 红黑装束", "暗点首领 · 管风琴"],
  },
] as const;

const DEMO_AUDIO_URLS: Record<string, string> = {
  夏以昼: traceDemoXiaYizhouAudio,
  叶修: traceDemoYeXiuAudio,
  庄方宜: traceDemoZhuangFangyiAudio,
  戴安娜: traceDemoDianaAudio,
  秦彻: traceDemoQinCheAudio,
};

export type DemoVariant = "skill" | "device";

interface DemoSectionProps {
  /** skill: role cards as the output of Trace/Inhabit. device: same cards as a deployable library. */
  variant?: DemoVariant;
}

export function DemoSection({ variant = "skill" }: DemoSectionProps) {
  const { t } = useTranslation();
  const [focusedDemoCard, setFocusedDemoCard] = useState<string | null>(null);
  const [playingDemoCard, setPlayingDemoCard] = useState<string | null>(null);
  const [demoPage, setDemoPage] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCardRef = useRef<string | null>(null);

  const stopCurrentAudio = (resetState = true) => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
    audioCardRef.current = null;
    if (resetState) {
      setPlayingDemoCard(null);
    }
  };

  const setFocusedCard = (title: string) => {
    if (audioCardRef.current && audioCardRef.current !== title) {
      stopCurrentAudio();
    }
    setFocusedDemoCard(title);
  };

  const toggleDemoAudio = async (title: string) => {
    const currentAudio = audioRef.current;
    if (audioCardRef.current === title && currentAudio) {
      if (!currentAudio.paused) {
        currentAudio.pause();
        setPlayingDemoCard(null);
      } else {
        try {
          await currentAudio.play();
          setPlayingDemoCard(title);
        } catch {
          setPlayingDemoCard(null);
        }
      }
      return;
    }

    stopCurrentAudio();
    const src = DEMO_AUDIO_URLS[title];
    if (!src) return;

    const nextAudio = new Audio(src);
    audioRef.current = nextAudio;
    audioCardRef.current = title;
    nextAudio.onended = () => {
      if (audioCardRef.current === title) {
        audioRef.current = null;
        audioCardRef.current = null;
        setPlayingDemoCard(null);
      }
    };

    try {
      await nextAudio.play();
      setPlayingDemoCard(title);
    } catch {
      audioRef.current = null;
      audioCardRef.current = null;
      setPlayingDemoCard(null);
    }
  };

  useEffect(() => () => stopCurrentAudio(false), []);

  const demoCardsPerPage = 3;
  const demoTotalPages = Math.ceil(DEMO_CARDS.length / demoCardsPerPage);
  const demoVisibleCards = DEMO_CARDS.slice(demoPage * demoCardsPerPage, (demoPage + 1) * demoCardsPerPage);
  const metaKey = variant === "device" ? "sections.demo.cardMetaDevice" : "sections.demo.cardMetaSkill";

  return (
    <section className="px-5">
      <motion.section id="demo" className="mx-auto max-w-6xl scroll-mt-32" {...fadeUp}>
        <SectionEyebrow>{t("sections.demo.eyebrow")}</SectionEyebrow>
        <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
          {t("sections.demo.title")}
        </h2>
        <Card className="mt-4 rounded-3xl border-border/50 bg-card/30 p-8 backdrop-blur md:p-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`demo-page-${demoPage}`}
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14, scale: 1.01 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-5"
              onMouseLeave={() => {
                setFocusedDemoCard(null);
                stopCurrentAudio();
              }}
            >
              {demoVisibleCards.map((item) => (
                <div
                  key={item.title}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-border/50 bg-background/15 md:rounded-3xl",
                    "transition-all duration-300",
                    focusedDemoCard && focusedDemoCard !== item.title && "opacity-75 blur-[1.5px] saturate-75",
                    focusedDemoCard === item.title && "scale-[1.03] border-border/70 shadow-[0_22px_48px_-30px_oklch(0.78_0.12_75/0.45)]"
                  )}
                  onMouseEnter={() => setFocusedCard(item.title)}
                  onFocus={() => setFocusedCard(item.title)}
                  onClick={() => setFocusedCard(item.title)}
                  tabIndex={0}
                >
                  <div className="aspect-[9/16] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className={cn(
                        "h-full w-full object-cover transition-transform duration-300",
                        focusedDemoCard === item.title ? "scale-[1.04]" : "scale-100"
                      )}
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,oklch(0.145_0.03_262/0.92),oklch(0.145_0.03_262/0.2),transparent)] p-4 md:p-5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium tracking-wide text-foreground md:text-base">{item.title}</p>
                      {focusedDemoCard === item.title && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleDemoAudio(item.title);
                          }}
                          className={cn(
                            "pointer-events-auto inline-flex h-6 w-6 translate-x-[-5px] translate-y-[3px] items-center justify-center rounded-full border border-border/60 bg-background/25",
                            "transition-colors hover:bg-background/40",
                            playingDemoCard === item.title ? "text-[oklch(0.78_0.12_75)]" : "text-foreground/75"
                          )}
                          aria-label={playingDemoCard === item.title ? `暂停${item.title}音频` : `播放${item.title}音频`}
                        >
                          {playingDemoCard === item.title ? <Pause className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-foreground/70">{t(metaKey, { enName: item.enName })}</p>
                    {focusedDemoCard === item.title && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs leading-6 text-foreground/80">{item.summary}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-border/60 bg-background/35 px-2.5 py-1 text-[10px] text-foreground/80"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="pt-0.5">
                          <ErrorBoundary name="soulpod-card">
                            <SoulPodDownload characterName={item.title} />
                          </ErrorBoundary>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
          {demoTotalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-1 md:mt-6 md:gap-1.5">
              {Array.from({ length: demoTotalPages }).map((_, pageIdx) => (
                <button
                  key={`demo-page-dot-${pageIdx}`}
                  type="button"
                  onClick={() => {
                    setDemoPage(pageIdx);
                    setFocusedDemoCard(null);
                    stopCurrentAudio();
                  }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full"
                  aria-label={`切换到第${pageIdx + 1}组角色卡`}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors",
                      demoPage === pageIdx ? "bg-[oklch(0.78_0.12_75)]" : "bg-foreground/30 hover:bg-foreground/50"
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </Card>
      </motion.section>
    </section>
  );
}
