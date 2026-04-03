import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { toast } from "sonner";

import heroBg from "@/assets/hero-bg.jpeg";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { cn } from "@/lib/utils";

/*
Memory Series — Home
- Hero: headline + SIGNAL list (English product names); no hero CTAs
- Products: five cards with English titles, links to detail pages
*/

interface HomeProps {
  targetSection?: string;
}

const navItems = [
  { id: "products", label: "产品" },
  { id: "vision", label: "愿景" },
] as const;

/** Visual-only product tiles: gradients and decor, no text. */
const PRODUCT_CARD_VISUAL = [
  {
    gradient: "from-oklch(0.22_0.08_280) via-oklch(0.18_0.06_260) to-oklch(0.14_0.04_262)",
    orb: "bg-[oklch(0.75_0.14_280/0.35)]",
  },
  {
    gradient: "from-oklch(0.24_0.06_240) via-oklch(0.17_0.05_220) to-oklch(0.13_0.03_262)",
    orb: "bg-[oklch(0.72_0.12_200/0.4)]",
  },
  {
    gradient: "from-oklch(0.26_0.07_150) via-oklch(0.18_0.05_145) to-oklch(0.14_0.03_262)",
    orb: "bg-[oklch(0.78_0.14_145/0.35)]",
  },
  {
    gradient: "from-oklch(0.28_0.1_55) via-oklch(0.2_0.07_70) to-oklch(0.14_0.03_262)",
    orb: "bg-[oklch(0.82_0.14_75/0.45)]",
  },
  {
    gradient: "from-oklch(0.22_0.05_320) via-oklch(0.16_0.04_300) to-oklch(0.13_0.03_262)",
    orb: "bg-[oklch(0.7_0.1_320/0.35)]",
  },
] as const;

const PRODUCT_EN_LABEL: Record<ProductKey, string> = {
  soulpod: "SoulPod",
  verse: "Verse",
  trace: "Trace / Inhabit",
  sculpt: "Sculpt",
  fluffydiary: "FluffyDiary",
};

const SIGNAL_PRODUCT_LABELS = [
  PRODUCT_EN_LABEL.soulpod,
  PRODUCT_EN_LABEL.verse,
  PRODUCT_EN_LABEL.trace,
  PRODUCT_EN_LABEL.sculpt,
  PRODUCT_EN_LABEL.fluffydiary,
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
  const productList = useMemo(() => PRODUCTS, []);

  // Scroll to target section when URL changes (e.g., /#/products → scroll to #products)
  useEffect(() => {
    if (!targetSection) return;
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
      <header className="fixed left-0 right-0 top-0 z-50">
        <div className="mx-auto max-w-6xl px-5">
          <div
            className={cn(
              "mt-2 flex items-center justify-between",
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

      <main className="pt-20 md:pt-[5.25rem]">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img src={heroBg} alt="" className="h-full w-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,oklch(0.145_0.03_262/0.65),oklch(0.145_0.03_262/0.88)_55%,oklch(0.145_0.03_262/1))]" />
            <div className="absolute inset-0 grain" />
          </div>

          <div className="relative mx-auto max-w-6xl px-5">
            <div className="grid min-h-0 grid-cols-1 items-center gap-8 py-6 md:min-h-[min(48vh,480px)] md:grid-cols-12 md:gap-10 md:py-8">
              <div className="md:col-span-7 md:self-center">
                <motion.h1
                  {...fadeUp}
                  transition={{ duration: 0.85, ease }}
                  className={cn(
                    "text-balance font-[Manrope] text-4xl font-semibold leading-[1.08] tracking-[-0.02em]",
                    "md:text-6xl"
                  )}
                >
                  从数字记忆，走向可继续的存在。
                </motion.h1>
              </div>

              <div className="relative md:col-span-5 md:self-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 1.0, ease }}
                  className="mx-auto w-full max-w-sm"
                >
                  <div className="rounded-3xl border border-border/60 bg-background/10 p-6 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div className="text-xs tracking-[0.32em] text-foreground/65">SIGNAL</div>
                      <div className="h-2 w-2 rounded-full bg-[oklch(0.78_0.12_75)] shadow-[0_0_20px_oklch(0.78_0.12_75_/60%)]" />
                    </div>
                    <Separator className="my-5 bg-border/60" />
                    <div className="space-y-3">
                      {SIGNAL_PRODUCT_LABELS.map((t, idx) => (
                        <div key={t} className="flex items-center gap-3">
                          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60" />
                          <div className="min-w-0 flex-1 font-[Manrope] text-sm font-medium leading-snug tracking-tight text-foreground/85">
                            {t}
                          </div>
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

        <section id="products" className="relative scroll-mt-24">
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-3 md:pb-16 md:pt-5">
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-3 md:gap-3 lg:grid-cols-5">
              {productList.map((p, i) => {
                const vis = PRODUCT_CARD_VISUAL[i] ?? PRODUCT_CARD_VISUAL[0];
                const label = PRODUCT_EN_LABEL[p.key];
                return (
                  <motion.div
                    key={p.key}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, ease, delay: i * 0.05 }}
                    className="min-w-0"
                  >
                    <Link
                      href={`/product/${p.key}`}
                      aria-label={label}
                      className={cn(
                        "relative block overflow-hidden rounded-2xl border border-border/50 md:rounded-3xl",
                        "aspect-[3/4] min-h-[180px] w-full",
                        "bg-gradient-to-br shadow-[0_20px_50px_-36px_oklch(0.15_0.04_262/0.9)]",
                        "transition-transform duration-300 hover:-translate-y-0.5 hover:border-border/80",
                        vis.gradient
                      )}
                    >
                      <div
                        className={cn(
                          "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl md:h-32 md:w-32",
                          vis.orb
                        )}
                      />
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-2/5 bg-[linear-gradient(to_top,oklch(0.1_0.02_262/0.5),transparent)]" />
                      <div className="relative z-10 p-4 pt-5 md:p-5 md:pt-6">
                        <p className="text-pretty font-[Manrope] text-[0.8125rem] font-semibold leading-snug tracking-tight text-foreground/95 md:text-sm">
                          {label}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="vision" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-10 md:py-14">
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
