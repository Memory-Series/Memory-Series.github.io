import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Link2, Pause, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import heroBg from "@/assets/hero-bg.jpeg";
import traceDemoXiaYizhou from "@/assets/demo/trace-inhabit/夏以昼/夏以昼.jpg";
import traceDemoYeXiu from "@/assets/demo/trace-inhabit/叶修/叶修.jpg";
import traceDemoZhuangFangyi from "@/assets/demo/trace-inhabit/庄方宜/庄方宜.jpeg";
import traceDemoXiaYizhouAudio from "@/assets/demo/trace-inhabit/夏以昼/夏以昼_没错你如果偷偷做了坏事.mp3";
import traceDemoYeXiuAudio from "@/assets/demo/trace-inhabit/叶修/叶修_路还很长.mp3";
import wechatOfficialQr from "@/assets/demo/other/gongzhonghao.jpeg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PRODUCT_BY_KEY, type ProductKey } from "@/lib/products";

interface ProductProps {
  keyParam?: string;
}

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.75, ease },
  viewport: { once: true, margin: "-60px" },
} as const;

function scrollToAnchor(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

type HeroHubId = "clawhub" | "skillhub";

const HERO_HUB_URLS: Record<HeroHubId, readonly [string, string]> = {
  clawhub: [
    "https://clawhub.ai/evangeliona/memory-trace",
    "https://clawhub.ai/evangeliona/memory-inhabit",
  ],
  skillhub: ["https://skillhub.cn/skills/memory-trace", "https://skillhub.cn/skills/memory-inhabit"],
};

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
    summary: "角色介绍占位符，后续补充人物背景、互动风格与关键设定。",
    tags: ["信息待补充", "设定占位"],
  },
] as const;

const DEMO_AUDIO_URLS: Record<string, string> = {
  夏以昼: traceDemoXiaYizhouAudio,
  叶修: traceDemoYeXiuAudio,
  庄方宜: "/audio/trace-inhabit-zhuangfangyi-placeholder.mp3",
};

const IMPLEMENTATION_ARTICLES = [
  {
    text: "《【私密讯息】夏以昼：如果引力有终点，那一定是你》",
    url: "https://mp.weixin.qq.com/s/MNv5pgyspYVVNPjGSZUsNw",
  },
  {
    text: "《哈哈，哥哥的保护欲还是那么强烈》",
    url: "https://mp.weixin.qq.com/s/469LO_0Sa3jPXyQGYFUDag",
  },
  {
    text: "《哥哥的飞行训练日常，也是看到了..》",
    url: "https://mp.weixin.qq.com/s/VHvBEiq1LZPGc22XlOII2g",
  },
  {
    text: "《【夏以昼】：训练再晚，也有人等你》",
    url: "https://mp.weixin.qq.com/s/U4AqQFVDxGxhmyg7QREd6g",
  },
  {
    text: "《【夏以昼】：三天后见，哥哥答应你平安回来》",
    url: "https://mp.weixin.qq.com/s/b9LXOFTXJCzvYglp-HqzDw",
  },
] as const;
const IMPLEMENTATION_BARRAGE_COUNT = 8;
const IMPLEMENTATION_BARRAGE_ROW_COUNT = 3;
const IMPLEMENTATION_BARRAGE_BASE_SPEED_SECONDS = 22;
const IMPLEMENTATION_BARRAGE_ROW_DELAYS = [0, -4.5, -9] as const;



function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs tracking-[0.34em] text-foreground/60">{children}</p>;
}

export default function Product({ keyParam }: ProductProps) {
  const [heroHub, setHeroHub] = useState<HeroHubId>("clawhub");
  const [focusedDemoCard, setFocusedDemoCard] = useState<string | null>(null);
  const [playingDemoCard, setPlayingDemoCard] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCardRef = useRef<string | null>(null);
  const raw = keyParam as ProductKey | undefined;
  const key: ProductKey = raw && raw in PRODUCT_BY_KEY ? raw : "trace";
  const product = PRODUCT_BY_KEY[key];

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [key]);

  if (!product) {
    return (
      <div className="min-h-screen bg-background p-10 text-foreground">
        <p className="text-foreground/70">未找到该产品。</p>
      </div>
    );
  }

  const getImplementationBarrageTrackStyle = (rowIdx: number) => ({
    animation: `implementation-barrage ${IMPLEMENTATION_BARRAGE_BASE_SPEED_SECONDS + rowIdx * 3}s linear infinite`,
    animationDelay: `${IMPLEMENTATION_BARRAGE_ROW_DELAYS[rowIdx] ?? 0}s`,
  });
  const isChineseLanguage = (i18n.resolvedLanguage ?? i18n.language).startsWith("zh");
  const anchors = [
    { id: "intro", t: t("nav.anchors.intro") },
    { id: "demo", t: t("nav.anchors.demo") },
    { id: "implementation", t: t("nav.anchors.implementation") },
    { id: "contact", t: t("nav.anchors.contact") },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm tracking-wide text-foreground/75 transition-colors hover:text-foreground"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
            {t("header.backToTop")}
          </button>
          <div className="text-center text-sm tracking-wide text-foreground/80">
            <span className="font-[Manrope] font-medium">{product.name}</span>
            <span className="text-foreground/50"> · {product.cnName}</span>
          </div>
          <button
            type="button"
            className="inline-flex h-9 min-w-12 items-center justify-center rounded-md border border-border/70 bg-background/65 px-3 text-sm font-medium tracking-wide text-foreground/85 transition-colors hover:bg-background/80 hover:text-foreground"
            onClick={() => {
              void i18n.changeLanguage(isChineseLanguage ? "en" : "zh");
            }}
            aria-label="语言切换按钮"
          >
            {isChineseLanguage ? "EN" : "中"}
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full min-h-[42vh] w-full object-cover opacity-[0.72] md:min-h-0" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,oklch(0.145_0.03_262/0.55),oklch(0.145_0.03_262/0.82)_45%,oklch(0.145_0.03_262/0.96))]" />
          <div className="absolute inset-0 grain" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 md:pb-24 md:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/30 px-4 py-2 text-xs tracking-[0.32em] text-foreground/70 backdrop-blur">
              {t("hero.series")}
              <span className="h-1 w-1 rounded-full bg-[oklch(0.78_0.12_75)]" aria-hidden />
              Trace / Inhabit
            </p>
            <h1
              className={cn(
                "text-balance font-[Manrope] text-4xl font-semibold leading-[1.08] tracking-[-0.02em]",
                "md:text-5xl lg:text-6xl"
              )}
            >
              {t("hero.title")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-8 text-foreground/72 md:text-lg md:leading-8">
              {t("hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                onClick={() => scrollToAnchor("intro")}
                className={cn(
                  "h-11 rounded-full px-7",
                  "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)]",
                  "hover:bg-[oklch(0.82_0.12_75)]"
                )}
              >
                {t("hero.primaryCta")}
              </Button>
              <Button
                type="button"
                onClick={() => scrollToAnchor("contact")}
                variant="outline"
                className="h-11 rounded-full border-border/60 bg-background/25 px-7 text-foreground backdrop-blur hover:bg-background/35"
              >
                {t("hero.contactCta")}
              </Button>
            </div>

            <div className="mx-auto mt-10 w-full max-w-2xl text-left md:max-w-3xl">
              <div className="rounded-2xl border border-border/50 bg-background/15 p-4 backdrop-blur md:rounded-3xl md:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-sm text-foreground/65">{t("hero.hubHint")}</p>
                  <div
                    className="inline-flex shrink-0 rounded-full border border-border/60 bg-background/25 p-0.5 backdrop-blur"
                    role="tablist"
                    aria-label="链接来源"
                  >
                    {(["clawhub", "skillhub"] as const).map((id) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={heroHub === id}
                        onClick={() => setHeroHub(id)}
                        className={cn(
                          "rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition-colors",
                          heroHub === id
                            ? "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)]"
                            : "text-foreground/70 hover:text-foreground"
                        )}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-border/40 bg-background/35 p-3 md:p-4">
                  <div className="grid gap-2">
                    {HERO_HUB_URLS[heroHub].map((href) => (
                      <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "block break-all rounded-lg border border-border/35 bg-background/25 px-3 py-2.5",
                          "font-mono text-[0.6875rem] leading-snug text-foreground/85",
                          "transition-colors hover:border-border/60 hover:bg-background/40",
                          "sm:text-xs"
                        )}
                      >
                        {href}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <nav className="mx-auto mt-14 flex max-w-3xl flex-wrap justify-center gap-2 md:mt-16" aria-label="页面内导航">
            {anchors.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => scrollToAnchor(a.id)}
                className={cn(
                  "rounded-full border border-border/50 bg-background/20 px-4 py-2 text-xs tracking-[0.2em] text-foreground/70 backdrop-blur",
                  "transition-colors hover:border-border/70 hover:bg-background/30 hover:text-foreground"
                )}
              >
                {a.t}
              </button>
            ))}
          </nav>
        </div>
      </section>

      <div className="h-px max-w-6xl bg-[linear-gradient(to_right,transparent,oklch(0.78_0.12_75/0.35),transparent)]" />

      <main className="mx-auto max-w-3xl space-y-20 px-5 py-16 md:space-y-28 md:py-24">
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

        <motion.section id="demo" className="scroll-mt-32" {...fadeUp}>
          <SectionEyebrow>{t("sections.demo.eyebrow")}</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            {t("sections.demo.title")}
          </h2>
          <Card className="mt-4 rounded-3xl border-border/50 bg-card/30 p-8 backdrop-blur md:p-10">
            <div
              className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-5"
              onMouseLeave={() => {
                setFocusedDemoCard(null);
                stopCurrentAudio();
              }}
            >
              {DEMO_CARDS.map((item) => (
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
                  <div className="aspect-[4/5] overflow-hidden">
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
                    <p className="mt-1 text-xs text-foreground/70">Trace / Inhabit 角色卡 · {item.enName}</p>
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
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.section>

        <motion.section id="implementation" className="scroll-mt-32" {...fadeUp}>
          <SectionEyebrow>{t("sections.implementation.eyebrow")}</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            {t("sections.implementation.title")}
          </h2>
          <Card className="mt-4 rounded-3xl border-border/50 bg-card/30 p-8 backdrop-blur md:p-10">
            <div className="group/barrage relative space-y-3 overflow-hidden py-1">
              {Array.from({ length: IMPLEMENTATION_BARRAGE_ROW_COUNT }).map((_, rowIdx) => (
                <div key={`implementation-barrage-row-${rowIdx}`} className="overflow-hidden">
                  <div
                    className="flex w-max items-center gap-10 pr-10 [animation-play-state:running] group-hover/barrage:[animation-play-state:paused]"
                    style={getImplementationBarrageTrackStyle(rowIdx)}
                  >
                    {Array.from({ length: IMPLEMENTATION_BARRAGE_COUNT }).map((__, idx) => {
                      const article = IMPLEMENTATION_ARTICLES[(rowIdx * IMPLEMENTATION_BARRAGE_COUNT + idx) % IMPLEMENTATION_ARTICLES.length];
                      return (
                        <a
                          key={`implementation-barrage-${rowIdx}-${idx}-${article.url}`}
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm leading-8 text-foreground/75 underline-offset-4 hover:text-foreground/90 hover:underline md:text-base md:leading-8"
                        >
                          <Link2 className="h-4 w-4" aria-hidden />
                          <span>{article.text}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.section>

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
      </main>

      <style>{`
        @keyframes implementation-barrage {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold">
                <span className="font-[Manrope]">Memory</span> Series
              </div>
              <p className="mt-2 text-sm leading-7 text-foreground/60">Memory Series · Trace / Inhabit</p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/55">
              {(["footer.links.privacy", "footer.links.terms", "footer.links.contact"] as const).map((item) => (
                <span key={item} className="underline-offset-4 hover:text-foreground/70">
                  {t(item)}
                </span>
              ))}
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
