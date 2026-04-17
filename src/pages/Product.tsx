import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Pause, Volume2 } from "lucide-react";

import heroBg from "@/assets/hero-bg.jpeg";
import traceDemoXiaYizhou from "@/assets/demo/trace-inhabit/夏以昼.jpg";
import traceDemoYeXiu from "@/assets/demo/trace-inhabit/叶修.jpg";
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

const anchors = [
  { id: "intro", t: "简介" },
  { id: "features", t: "特性" },
  { id: "demo", t: "演示" },
  { id: "implementation", t: "实现" },
  { id: "contact", t: "通讯" },
] as const;

type HeroHubId = "clawhub" | "skillhub";

const HERO_HUB_URLS: Record<HeroHubId, readonly [string, string]> = {
  clawhub: [
    "https://clawhub.ai/evangeliona/memory-trace",
    "https://clawhub.ai/evangeliona/memory-inhabit",
  ],
  skillhub: ["https://skillhub.cn/skills/memory-trace", "https://skillhub.cn/skills/memory-inhabit"],
};

const INTRO_TEXT =
  "Trace / Inhabit 是一个面向数字角色持续化的开源方向页面，目标是把“角色设定 + 能力调用 + 长期交互”组织成可复用能力。";

const FEATURE_ITEMS = [
  "角色设定可配置：支持基础身份、行为边界与语气偏好。",
  "知识能力可挂载：可接入外部知识与任务流程。",
  "交互状态可延续：保留关键上下文，减少重复输入。",
  "结构清晰可扩展：模块拆分便于后续接入更多能力。",
] as const;

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
] as const;

const DEMO_AUDIO_URLS: Record<string, string> = {
  夏以昼: "/audio/trace-inhabit-xiayizhou-placeholder.mp3",
  叶修: "/audio/trace-inhabit-yexiu-placeholder.mp3",
};

const IMPLEMENTATION_TEXT =
  "当前实现采用“角色配置层 + 能力执行层 + 交互编排层”的结构。页面用于承载该能力的说明入口，后续可继续补充 API、数据流与部署细节。";



function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs tracking-[0.34em] text-foreground/60">{children}</p>;
}

export default function Product({ keyParam }: ProductProps) {
  const [heroHub, setHeroHub] = useState<HeroHubId>("clawhub");
  const [focusedDemoCard, setFocusedDemoCard] = useState<string | null>(null);
  const [playingDemoCard, setPlayingDemoCard] = useState<string | null>(null);
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
            返回顶部
          </button>
          <div className="text-center text-sm tracking-wide text-foreground/80">
            <span className="font-[Manrope] font-medium">{product.name}</span>
            <span className="text-foreground/50"> · {product.cnName}</span>
          </div>
          <span className="inline-block w-[5.5rem] shrink-0 md:w-24" aria-hidden />
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
              Memory Series
              <span className="h-1 w-1 rounded-full bg-[oklch(0.78_0.12_75)]" aria-hidden />
              Trace / Inhabit
            </p>
            <h1
              className={cn(
                "text-balance font-[Manrope] text-4xl font-semibold leading-[1.08] tracking-[-0.02em]",
                "md:text-5xl lg:text-6xl"
              )}
            >
              {product.heroTitle}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-8 text-foreground/72 md:text-lg md:leading-8">
              {product.heroSubtitle}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button
                className={cn(
                  "h-11 rounded-full px-7",
                  "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)]",
                  "hover:bg-[oklch(0.82_0.12_75)]"
                )}
              >
                {product.ctaPrimary}
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-full border-border/60 bg-background/25 px-7 text-foreground backdrop-blur hover:bg-background/35"
              >
                {product.ctaSecondary}
              </Button>
            </div>

            <div className="mx-auto mt-10 w-full max-w-2xl text-left md:max-w-3xl">
              <div className="rounded-2xl border border-border/50 bg-background/15 p-4 backdrop-blur md:rounded-3xl md:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-sm text-foreground/65">选择来源后查看链接：</p>
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
                onClick={() => document.getElementById(a.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
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
          <SectionEyebrow>简介</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            项目简介
          </h2>
          <Card className="mt-8 rounded-3xl border-border/50 bg-card/30 p-8 backdrop-blur md:p-10">
            <p className="text-pretty text-sm leading-8 text-foreground/75 md:text-base md:leading-8">{INTRO_TEXT}</p>
          </Card>
        </motion.section>

        <motion.section id="features" className="scroll-mt-32" {...fadeUp}>
          <SectionEyebrow>特性 (Features)</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            核心特性
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {FEATURE_ITEMS.map((line) => (
              <Card
                key={line}
                className="rounded-2xl border-border/50 bg-background/15 p-6 backdrop-blur md:rounded-3xl md:p-7"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[oklch(0.78_0.12_75)]" aria-hidden />
                  <p className="text-sm leading-7 text-foreground/75">{line}</p>
                </div>
              </Card>
            ))}
          </div>
        </motion.section>

        <motion.section id="demo" className="scroll-mt-32" {...fadeUp}>
          <SectionEyebrow>演示 (Demo)</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            演示与预览
          </h2>
          <Card className="mt-8 rounded-3xl border-border/50 bg-card/30 p-8 backdrop-blur md:p-10">
            <div
              className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6"
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
          <SectionEyebrow>实现</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            实现说明
          </h2>
          <Card className="mt-8 rounded-3xl border-border/50 bg-card/30 p-8 backdrop-blur md:p-10">
            <p className="text-pretty text-sm leading-8 text-foreground/75 md:text-base md:leading-8">{IMPLEMENTATION_TEXT}</p>
          </Card>
        </motion.section>

        <motion.section id="contact" className="scroll-mt-32" {...fadeUp}>
          <SectionEyebrow>通讯</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            通讯方式
          </h2>
          <Card className="mt-10 rounded-3xl border-border/50 bg-card/30 p-8 backdrop-blur md:p-10">
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
              {["隐私政策", "服务条款", "联系地址"].map((t) => (
                <span key={t} className="underline-offset-4 hover:text-foreground/70">
                  {t}
                </span>
              ))}
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
