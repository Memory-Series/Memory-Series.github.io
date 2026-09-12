import { motion } from "framer-motion";
import { Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/card";
import { fadeUp } from "@/lib/motion";
import { SectionEyebrow } from "./shared";

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

function getImplementationBarrageTrackStyle(rowIdx: number) {
  return {
    animation: `implementation-barrage ${IMPLEMENTATION_BARRAGE_BASE_SPEED_SECONDS + rowIdx * 3}s linear infinite`,
    animationDelay: `${IMPLEMENTATION_BARRAGE_ROW_DELAYS[rowIdx] ?? 0}s`,
  };
}

export function ImplementationSection() {
  const { t } = useTranslation();

  return (
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
                  const article =
                    IMPLEMENTATION_ARTICLES[
                      (rowIdx * IMPLEMENTATION_BARRAGE_COUNT + idx) % IMPLEMENTATION_ARTICLES.length
                    ];
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
    </motion.section>
  );
}
