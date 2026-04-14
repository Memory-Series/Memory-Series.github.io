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

export default function Product({ keyParam }: ProductProps) {
  const raw = keyParam as ProductKey | undefined;
  const key: ProductKey = raw && raw in PRODUCT_BY_KEY ? raw : "trace";
  const product = PRODUCT_BY_KEY[key];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [key]);

  if (!product) {
    return (
      <div className="min-h-screen bg-background text-foreground p-10">
        <p className="text-foreground/70">未找到该产品。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp className="h-4 w-4" /> 返回顶部
          </button>
          <div className="text-sm tracking-wide text-foreground/75">
            <span className="font-[Manrope]">{product.name}</span>
            <span className="text-foreground/55">（{product.cnName}）</span>
          </div>
          <span className="inline-block w-[5.5rem] shrink-0 md:w-24" aria-hidden />
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="抽象科技氛围背景" className="h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,oklch(0.145_0.03_262/0.75),oklch(0.145_0.03_262/0.9)_55%,oklch(0.145_0.03_262/1))]" />
          <div className="absolute inset-0 grain" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5">
          <div className="grid min-h-[58vh] grid-cols-1 items-end gap-10 pb-14 pt-16 md:min-h-[64vh] md:grid-cols-12 md:items-center">
            <div className="md:col-span-8">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease }}
              >
                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/25 px-4 py-2 text-xs tracking-[0.32em] text-foreground/70 backdrop-blur">
                  产品页
                  <span className="h-1 w-1 rounded-full bg-[oklch(0.78_0.12_75)]" />
                  {product.name}
                </p>

                <h1 className={cn("text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.02em]", "md:text-6xl")}>
                  {product.heroTitle}
                </h1>
                <p className="mt-6 max-w-2xl text-pretty text-base leading-8 text-foreground/75 md:text-lg">
                  {product.heroSubtitle}
                </p>

                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Button
                    className={cn(
                      "h-11 rounded-full px-6",
                      "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)]",
                      "hover:bg-[oklch(0.82_0.12_75)]"
                    )}
                  >
                    {product.ctaPrimary}
                  </Button>
                  <Button variant="outline" className="h-11 rounded-full border-border/70 bg-background/20 px-6">
                    {product.ctaSecondary}
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-20 md:py-24">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="text-xs tracking-[0.34em] text-foreground/60">一句话版本</p>
            <p className="mt-4 text-base leading-8 text-foreground/75">{product.oneLiner}</p>

            <Separator className="my-8 bg-border/60" />

            <p className="text-xs tracking-[0.34em] text-foreground/60">导航</p>
            <div className="mt-4 grid gap-2 text-sm text-foreground/75">
              {[
                { id: "definition", t: "产品定义" },
                { id: "value", t: "核心价值" },
                { id: "experience", t: "产品体验" },
                { id: "tech", t: "技术表达" },
                { id: "scenarios", t: "适用场景" },
              ].map((it) => (
                <a
                  key={it.id}
                  href={`#${it.id}`}
                  className="rounded-xl border border-border/60 bg-card/25 px-4 py-2 hover:bg-card/35"
                >
                  {it.t}
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-8">
            <div className="space-y-10">
              <section id="definition" className="scroll-mt-28">
                <Card className="rounded-3xl border-border/60 bg-card/35 p-8 backdrop-blur">
                  <div className="text-xs tracking-[0.34em] text-foreground/60">产品定义</div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] md:text-3xl">{product.definitionTitle}</h2>
                  <p className="mt-5 whitespace-pre-line text-sm leading-8 text-foreground/75 md:text-base">{product.definitionBody}</p>
                </Card>
              </section>

              <section id="value" className="scroll-mt-28">
                <Card className="rounded-3xl border-border/60 bg-card/35 p-8 backdrop-blur">
                  <div className="text-xs tracking-[0.34em] text-foreground/60">核心价值</div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] md:text-3xl">{product.valueTitle}</h2>
                  <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
                    {product.valueBullets.map((b) => (
                      <div key={b.title} className="rounded-2xl border border-border/60 bg-background/10 p-5">
                        <div className="font-medium tracking-wide">{b.title}</div>
                        <p className="mt-2 text-sm leading-7 text-foreground/70">{b.body}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>

              <section id="experience" className="scroll-mt-28">
                <Card className="rounded-3xl border-border/60 bg-card/35 p-8 backdrop-blur">
                  <div className="text-xs tracking-[0.34em] text-foreground/60">产品体验</div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] md:text-3xl">{product.experienceTitle}</h2>
                  <p className="mt-5 whitespace-pre-line text-sm leading-8 text-foreground/75 md:text-base">{product.experienceBody}</p>
                </Card>
              </section>

              <section id="tech" className="scroll-mt-28">
                <Card className="rounded-3xl border-border/60 bg-card/35 p-8 backdrop-blur">
                  <div className="text-xs tracking-[0.34em] text-foreground/60">技术表达</div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] md:text-3xl">{product.techTitle}</h2>
                  <p className="mt-5 whitespace-pre-line text-sm leading-8 text-foreground/75 md:text-base">{product.techBody}</p>
                </Card>
              </section>

              <section id="scenarios" className="scroll-mt-28">
                <Card className="rounded-3xl border-border/60 bg-card/35 p-8 backdrop-blur">
                  <div className="text-xs tracking-[0.34em] text-foreground/60">适用场景</div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] md:text-3xl">{product.scenariosTitle}</h2>
                  <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
                    {product.scenarios.map((s) => (
                      <div key={s.title} className="rounded-2xl border border-border/60 bg-background/10 p-5">
                        <div className="font-medium tracking-wide">{s.title}</div>
                        <p className="mt-2 text-sm leading-7 text-foreground/70">{s.body}</p>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-8 bg-border/60" />

                  <p className="text-sm leading-8 text-foreground/75">{product.closing}</p>
                </Card>
              </section>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <div className="font-semibold">
                <span className="font-[Manrope]">Memory</span> Series
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground/65">© Memory Series · 记忆是绝对私有的资产</p>
            </div>
            <div className="md:col-span-7">
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-foreground/70">
                {[
                  { t: "隐私政策", k: "privacy" },
                  { t: "服务条款", k: "terms" },
                  { t: "社交媒体", k: "social" },
                ].map((it) => (
                  <span key={it.k} className="underline-offset-4 hover:underline">
                    {it.t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
