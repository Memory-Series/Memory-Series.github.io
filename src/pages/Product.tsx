import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

import heroBg from "@/assets/hero-bg.jpeg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  { id: "definition", t: "定义" },
  { id: "value", t: "价值" },
  { id: "experience", t: "体验" },
  { id: "tech", t: "技术" },
  { id: "scenarios", t: "场景" },
] as const;

const HERO_HUB_BLOCKS = [
  {
    label: "clawhub",
    urls: [
      "https://clawhub.ai/evangeliona/memory-trace",
      "https://clawhub.ai/evangeliona/memory-inhabit",
    ],
  },
  {
    label: "skillhub",
    urls: ["https://skillhub.cn/skills/memory-trace", "https://skillhub.cn/skills/memory-inhabit"],
  },
] as const;

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs tracking-[0.34em] text-foreground/60">{children}</p>;
}

export default function Product({ keyParam }: ProductProps) {
  const raw = keyParam as ProductKey | undefined;
  const key: ProductKey = raw && raw in PRODUCT_BY_KEY ? raw : "trace";
  const product = PRODUCT_BY_KEY[key];

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
                {HERO_HUB_BLOCKS.map((block, blockIdx) => (
                  <div key={block.label} className={cn(blockIdx > 0 && "mt-6 border-t border-border/40 pt-6")}>
                    <span
                      className={cn(
                        "inline-flex rounded-full border border-border/60 bg-background/25 px-3 py-1",
                        "text-xs font-medium tracking-wide text-foreground/80"
                      )}
                    >
                      {block.label}
                    </span>
                    <div className="mt-3 grid gap-2">
                      {block.urls.map((href) => (
                        <a
                          key={href}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "block break-all rounded-xl border border-border/50 bg-background/20 px-3 py-2.5",
                            "font-mono text-[0.6875rem] leading-snug text-foreground/80 backdrop-blur",
                            "transition-colors hover:border-border/70 hover:bg-background/30 hover:text-foreground",
                            "sm:text-xs"
                          )}
                        >
                          {href}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <nav
            className="mx-auto mt-14 flex max-w-3xl flex-wrap justify-center gap-2 md:mt-16"
            aria-label="页面内导航"
          >
            {anchors.map((a) => (
              <a
                key={a.id}
                href={`#${a.id}`}
                className={cn(
                  "rounded-full border border-border/50 bg-background/20 px-4 py-2 text-xs tracking-[0.2em] text-foreground/70 backdrop-blur",
                  "transition-colors hover:border-border/70 hover:bg-background/30 hover:text-foreground"
                )}
              >
                {a.t}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="h-px max-w-6xl bg-[linear-gradient(to_right,transparent,oklch(0.78_0.12_75/0.35),transparent)]" />

      <main className="mx-auto max-w-3xl space-y-20 px-5 py-16 md:space-y-28 md:py-24">
        <motion.section id="definition" className="scroll-mt-32" {...fadeUp}>
          <SectionEyebrow>产品定义</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            {product.definitionTitle}
          </h2>
          <Card className="mt-8 rounded-3xl border-border/50 bg-card/30 p-8 backdrop-blur md:p-10">
            <p className="whitespace-pre-line text-pretty text-sm leading-8 text-foreground/75 md:text-base md:leading-8">
              {product.definitionBody}
            </p>
          </Card>
        </motion.section>

        <motion.section id="value" className="scroll-mt-32" {...fadeUp}>
          <SectionEyebrow>核心价值</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            {product.valueTitle}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            {product.valueBullets.map((b) => (
              <Card
                key={b.title}
                className="rounded-2xl border-border/50 bg-background/15 p-6 backdrop-blur md:rounded-3xl md:p-7"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[oklch(0.78_0.12_75)]" aria-hidden />
                  <div>
                    <h3 className="font-medium leading-snug tracking-wide text-foreground">{b.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-foreground/70">{b.body}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.section>

        <motion.section id="experience" className="scroll-mt-32" {...fadeUp}>
          <SectionEyebrow>产品体验</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            {product.experienceTitle}
          </h2>
          <Card className="mt-8 rounded-3xl border-border/50 bg-card/30 p-8 backdrop-blur md:p-10">
            <p className="whitespace-pre-line text-pretty text-sm leading-8 text-foreground/75 md:text-base md:leading-8">
              {product.experienceBody}
            </p>
          </Card>
        </motion.section>

        <motion.section id="tech" className="scroll-mt-32" {...fadeUp}>
          <SectionEyebrow>技术表达</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            {product.techTitle}
          </h2>
          <Card className="mt-8 rounded-3xl border-border/50 bg-card/30 p-8 backdrop-blur md:p-10">
            <p className="whitespace-pre-line text-pretty text-sm leading-8 text-foreground/75 md:text-base md:leading-8">
              {product.techBody}
            </p>
          </Card>
        </motion.section>

        <motion.section id="scenarios" className="scroll-mt-32" {...fadeUp}>
          <SectionEyebrow>适用场景</SectionEyebrow>
          <h2 className="mt-4 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            {product.scenariosTitle}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            {product.scenarios.map((s) => (
              <Card
                key={s.title}
                className="rounded-2xl border-border/50 bg-background/15 p-6 backdrop-blur md:rounded-3xl md:p-7"
              >
                <h3 className="font-medium tracking-wide text-foreground">{s.title}</h3>
                <p className="mt-3 text-sm leading-7 text-foreground/70">{s.body}</p>
              </Card>
            ))}
          </div>
          <Separator className="my-12 bg-border/50" />
          <p className="text-pretty text-sm leading-8 text-foreground/72 md:text-base">{product.closing}</p>
        </motion.section>

        <motion.section {...fadeUp} className="rounded-3xl border border-border/50 bg-background/10 p-8 backdrop-blur md:p-10">
          <SectionEyebrow>一句话</SectionEyebrow>
          <p className="mt-4 text-base leading-8 text-foreground/80 md:text-lg">{product.oneLiner}</p>
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
              {["隐私政策", "服务条款", "社交媒体"].map((t) => (
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
