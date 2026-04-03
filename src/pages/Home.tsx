import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Menu } from "lucide-react";
import { toast } from "sonner";

import heroBg from "@/assets/hero-bg.jpeg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { cn } from "@/lib/utils";

/*
Memory Series — Home (file reminder)
- Design movement: Cinematic Tech-Noir Minimalism (参考 minimaxi.com 的信息密度与节奏)
- Core: deep-space void, silver precision, warm-gold emotional spark
- Copy: 短句、低噪、清晰层级；避免长段落
- Products: 5 张卡片切换（移动端横向滚动 + snap）
*/

interface HomeProps {
  targetSection?: string;
}

const navItems = [
  { id: "products", label: "产品" },
  { id: "vision", label: "愿景" },
] as const;

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.75, ease },
  viewport: { once: true, margin: "-80px" },
} as const;

function AnchorLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Link
      href={`/${id}`}
      className={cn(
        "text-sm tracking-[0.22em] uppercase",
        "text-foreground/70 hover:text-foreground",
        "transition-colors duration-300",
        "relative",
        "after:absolute after:left-0 after:-bottom-2 after:h-px after:w-0 after:bg-foreground/50",
        "after:transition-[width] after:duration-300 hover:after:w-full"
      )}
    >
      {children}
    </Link>
  );
}

export default function Home({ targetSection }: HomeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<ProductKey>("soulpod");

  const productTabs = useMemo(() => PRODUCTS, []);
  const active = useMemo(
    () => productTabs.find((p) => p.key === activeProduct) ?? productTabs[0],
    [activeProduct, productTabs]
  );

  // Scroll to target section when URL changes (e.g., /#/products → scroll to #products)
  useEffect(() => {
    if (!targetSection) return;
    // Legacy: intro → products; principles section removed → vision
    const id =
      targetSection === "intro"
        ? "products"
        : targetSection === "principles"
          ? "vision"
          : targetSection;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [targetSection]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Fixed floating nav */}
      <header className="fixed left-0 right-0 top-0 z-50">
        <div className="mx-auto max-w-6xl px-5">
          <div
            className={cn(
              "mt-4 flex items-center justify-between",
              "rounded-full border border-border/70",
              "bg-background/55 backdrop-blur-md",
              "shadow-[0_10px_40px_-20px_oklch(0.78_0.12_75_/35%)]"
            )}
          >
            <div className="flex items-center gap-3 px-5 py-3">
              <div className="h-8 w-8 rounded-full border border-border/80 bg-foreground/5" />
              <span className="font-semibold tracking-wide">
                <span className="font-[Manrope]">Memory</span> Series
              </span>
            </div>

            <nav className="hidden items-center gap-8 md:flex">
              {navItems.map((it) => (
                <AnchorLink key={it.id} id={it.id}>
                  {it.label}
                </AnchorLink>
              ))}
            </nav>

            <div className="flex items-center gap-2 px-4 py-2">
              <Button
                variant="ghost"
                className="hidden h-9 rounded-full px-3 text-xs tracking-[0.24em] text-foreground/70 hover:text-foreground md:inline-flex"
                onClick={() => toast.message("语言切换占位", { description: "将来可接入国际化（中/En）。" })}
              >
                中 / En
              </Button>

              {/* Mobile menu */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-foreground/80 hover:text-foreground md:hidden"
                    aria-label="打开菜单"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="top" className="border-border/60 bg-background/85 backdrop-blur">
                  <SheetHeader>
                    <SheetTitle className="text-left">
                      <span className="font-[Manrope]">Memory</span> Series
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 grid gap-3">
                    {navItems.map((it) => (
                      <Link
                        key={it.id}
                        href={`/${it.id}`}
                        className="rounded-2xl border border-border/60 bg-card/35 px-4 py-3 text-sm text-foreground/80"
                        onClick={() => setMenuOpen(false)}
                      >
                        {it.label}
                      </Link>
                    ))}
                    <Button
                      variant="outline"
                      className="mt-2 h-11 rounded-full border-border/60 bg-background/30"
                      onClick={() => {
                        setMenuOpen(false);
                        toast.message("语言切换占位", { description: "将来可接入国际化（中/En）。" });
                      }}
                    >
                      中 / En
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img src={heroBg} alt="抽象科技氛围背景" className="h-full w-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,oklch(0.145_0.03_262/0.65),oklch(0.145_0.03_262/0.88)_55%,oklch(0.145_0.03_262/1))]" />
            <div className="absolute inset-0 grain" />
          </div>

          <div className="relative mx-auto max-w-6xl px-5">
            <div className="grid min-h-[78vh] grid-cols-1 items-end gap-10 pb-14 pt-20 md:min-h-[88vh] md:grid-cols-12 md:items-center md:pb-20">
              <div className="md:col-span-7">
                <motion.div {...fadeUp}>
                  <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/25 px-4 py-2 text-xs tracking-[0.32em] text-foreground/70 backdrop-blur">
                    数字记忆 · 数字生命
                    <span className="h-1 w-1 rounded-full bg-[oklch(0.78_0.12_75)]" />
                    隐私优先
                  </p>
                </motion.div>

                <motion.h1
                  {...fadeUp}
                  transition={{ duration: 0.85, ease, delay: 0.05 }}
                  className={cn(
                    "text-balance font-[Manrope] text-4xl font-semibold leading-[1.08] tracking-[-0.02em]",
                    "md:text-6xl"
                  )}
                >
                  从数字记忆，走向可继续的存在。
                </motion.h1>

                <motion.p
                  {...fadeUp}
                  transition={{ duration: 0.85, ease, delay: 0.12 }}
                  className="mt-6 max-w-xl text-pretty text-base leading-7 text-foreground/75 md:text-lg"
                >
                  五条产品线，分别在对话、空间、角色、实体与日常中，让记忆以更自然的方式被触达。
                </motion.p>

                <motion.div
                  {...fadeUp}
                  transition={{ duration: 0.85, ease, delay: 0.2 }}
                  className="mt-10 flex flex-wrap items-center gap-3"
                >
                  <Button
                    className={cn(
                      "h-11 rounded-full px-6",
                      "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)]",
                      "hover:bg-[oklch(0.82_0.12_75)]"
                    )}
                    onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    查看产品
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full border-border/70 bg-background/20 px-6 text-foreground hover:bg-background/30"
                    onClick={() => document.getElementById("vision")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    查看愿景
                  </Button>
                </motion.div>

                <motion.div
                  {...fadeUp}
                  transition={{ duration: 0.85, ease, delay: 0.28 }}
                  className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3"
                >
                  {[
                    { k: "5", v: "产品线" },
                    { k: "1D→3D→实体", v: "多维重构" },
                    { k: "隐私优先", v: "边界可控" },
                  ].map((it) => (
                    <div
                      key={it.k}
                      className="rounded-2xl border border-border/60 bg-background/15 px-5 py-5 backdrop-blur"
                    >
                      <div className="font-[Manrope] text-2xl font-semibold tracking-tight">{it.k}</div>
                      <div className="mt-2 text-sm leading-6 text-foreground/70">{it.v}</div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right-side “signal” decoration */}
              <div className="relative md:col-span-5">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 1.0, ease }}
                  className="mx-auto max-w-sm"
                >
                  <div className="rounded-3xl border border-border/60 bg-background/10 p-6 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div className="text-xs tracking-[0.32em] text-foreground/65">SIGNAL</div>
                      <div className="h-2 w-2 rounded-full bg-[oklch(0.78_0.12_75)] shadow-[0_0_20px_oklch(0.78_0.12_75_/60%)]" />
                    </div>
                    <Separator className="my-5 bg-border/60" />
                    <div className="space-y-3">
                      {["对话", "空间", "角色", "实体", "日常"].map((t, idx) => (
                        <div key={t} className="flex items-center gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                          <div className="flex-1 text-sm text-foreground/75">{t}</div>
                          <div
                            className="h-px flex-1 bg-[linear-gradient(to_right,oklch(0.92_0.02_265/0.35),transparent)]"
                            style={{ opacity: 0.92 - idx * 0.12 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCTS (card switch) */}
        <section id="products" className="relative scroll-mt-28">
          <div className="mx-auto max-w-6xl px-5 py-24 md:py-28">
            <motion.div {...fadeUp} className="flex items-end justify-between gap-6">
              <div>
                <p className="text-xs tracking-[0.34em] text-foreground/60">产品</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">五条产品线</h2>
              </div>
              <div className="hidden text-sm text-foreground/60 md:block">卡片切换 · 同一套视觉语言</div>
            </motion.div>

            <div className="mt-12">
              <Tabs value={activeProduct} onValueChange={(v) => setActiveProduct(v as ProductKey)}>
                <div className="flex flex-col gap-8">
                  <TabsList
                    className={cn(
                      "w-full bg-transparent",
                      "flex gap-3 overflow-x-auto p-1",
                      "[scrollbar-width:none] [-ms-overflow-style:none]",
                      "snap-x snap-mandatory"
                    )}
                  >
                    {/* hide scrollbar (webkit) */}
                    <style>{`.ms-scroll::-webkit-scrollbar{display:none}`}</style>
                    {productTabs.map((p) => (
                      <TabsTrigger
                        key={p.key}
                        value={p.key}
                        className={cn(
                          "ms-scroll",
                          "group min-w-[15rem] shrink-0 snap-start",
                          "rounded-3xl border border-border/60",
                          "bg-card/20 backdrop-blur",
                          "px-5 py-4 text-left",
                          "transition-all duration-300",
                          "data-[state=active]:bg-background/35 data-[state=active]:shadow-[0_20px_70px_-55px_oklch(0.78_0.12_75_/55%)]",
                          "hover:bg-background/25"
                        )}
                      >
                        <div className="flex min-w-0 flex-col gap-2">
                          <div className="flex items-baseline justify-between gap-3">
                            <div className="min-w-0 text-sm font-medium leading-tight tracking-wide">
                              <span className="block truncate">{p.name}</span>
                              <span className="mt-1 block text-xs text-foreground/55">{p.cnName}</span>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-foreground/30 group-data-[state=active]:bg-[oklch(0.78_0.12_75)]" />
                          </div>
                          <div className="text-xs leading-5 text-foreground/60 line-clamp-2">{p.shortLine}</div>
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* Content panel */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                    <div className="md:col-span-7">
                      <Card className="relative overflow-hidden rounded-3xl border-border/60 bg-card/35 p-8 backdrop-blur">
                        <div className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_50%_at_30%_30%,black,transparent)]">
                          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[oklch(0.92_0.02_265/0.35)] blur-3xl" />
                          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[oklch(0.78_0.12_75/0.35)] blur-3xl" />
                        </div>

                        <AnimatePresence mode="wait">
                          <motion.div
                            key={active.key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.35, ease }}
                            className="relative"
                          >
                            <div className="text-xs tracking-[0.34em] text-foreground/60">概览</div>
                            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
                              {active.heroTitle}
                            </h3>
                            <p className="mt-4 text-sm leading-7 text-foreground/75 md:text-base">{active.oneLiner}</p>

                            <Separator className="my-7 bg-border/60" />

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                              {active.valueBullets.slice(0, 3).map((b) => (
                                <div
                                  key={b.title}
                                  className="rounded-2xl border border-border/60 bg-background/10 px-4 py-4"
                                >
                                  <div className="text-sm font-medium leading-6">{b.title}</div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-8 flex flex-wrap items-center gap-3">
                              <Link
                                href={`/product/${active.key}`}
                                className={cn(
                                  "inline-flex h-11 items-center gap-2 rounded-full px-6",
                                  "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)]",
                                  "hover:bg-[oklch(0.82_0.12_75)]"
                                )}
                              >
                                查看详情 <ArrowRight className="h-4 w-4" />
                              </Link>
                              <Button
                                variant="outline"
                                className="h-11 rounded-full border-border/70 bg-background/20 px-6 text-foreground hover:bg-background/30"
                                onClick={() =>
                                  toast.message("体验方式占位", { description: "后续可接入 Demo / 视频 / 预约体验。" })
                                }
                              >
                                {active.ctaSecondary}
                              </Button>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </Card>
                    </div>

                    <div className="md:col-span-5">
                      <div className="grid gap-6">
                        <Card className="rounded-3xl border-border/60 bg-background/10 p-7 backdrop-blur">
                          <div className="text-xs tracking-[0.34em] text-foreground/60">五维入口</div>
                          <div className="mt-4 space-y-2 text-sm leading-7 text-foreground/72">
                            <p>对话 · 语气与关系感</p>
                            <p>空间 · 氛围与存在感</p>
                            <p>角色 · 行为逻辑与能力</p>
                            <p>实体 · 可触摸的留存</p>
                            <p>日常 · 连续性与时间线</p>
                          </div>
                        </Card>
                        <Card className="rounded-3xl border-border/60 bg-background/10 p-7 backdrop-blur">
                          <div className="text-xs tracking-[0.34em] text-foreground/60">切换提示</div>
                          <p className="mt-4 text-sm leading-7 text-foreground/70">
                            同一份记忆，在不同维度里继续存在。
                          </p>
                        </Card>
                      </div>
                    </div>
                  </div>
                </div>
              </Tabs>
            </div>
          </div>
        </section>

        {/* VISION */}
        <section id="vision" className="mx-auto max-w-6xl scroll-mt-28 px-5 py-24 md:py-28">
          <motion.div {...fadeUp} className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="text-xs tracking-[0.34em] text-foreground/60">愿景</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">让记忆走向延续</h2>
            </div>
            <div className="md:col-span-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[
                  { t: "留存", d: "把重要的保存下来" },
                  { t: "触达", d: "以更自然方式进入" },
                  { t: "延续", d: "让关系继续发生" },
                ].map((it) => (
                  <div key={it.t} className="rounded-3xl border border-border/60 bg-background/10 p-7 backdrop-blur">
                    <div className="text-base font-medium tracking-wide">{it.t}</div>
                    <p className="mt-3 text-sm leading-7 text-foreground/70">{it.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Closing note (no CTA buttons) */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
            <div className="rounded-[2.25rem] border border-border/60 bg-[linear-gradient(135deg,oklch(0.18_0.03_262/0.85),oklch(0.22_0.03_262/0.65))] p-10 text-center md:p-14">
              <motion.div {...fadeUp} className="mx-auto max-w-2xl">
                <div className="text-xs tracking-[0.34em] text-foreground/60">下一步</div>
                <h3 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
                  选择一个入口，让记忆开始继续。
                </h3>
                <p className="mt-5 text-pretty text-sm leading-7 text-foreground/70 md:text-base">
                  从对话、空间、角色、实体或日常记录开始。
                </p>
              </motion.div>
            </div>
          </div>
        </section>
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
                {[{ t: "隐私政策", k: "privacy" }, { t: "服务条款", k: "terms" }, { t: "社交媒体", k: "social" }].map(
                  (it) => (
                    <button
                      key={it.k}
                      className="underline-offset-4 hover:underline"
                      onClick={() => toast.message("链接占位", { description: "后续可接入真实页面/外链。" })}
                    >
                      {it.t}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
