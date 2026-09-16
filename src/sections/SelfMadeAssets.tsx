import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { DialogueBgConverter } from "./DialogueBgConverter";

/**
 * Split into its own chunk.
 *
 * The frame encoder, the GIF pipeline and the ZIP writer together add ~20 kB,
 * and the initial bundle sits close to Vite's 500 kB warning threshold. The
 * chunk is fetched when this panel mounts on the device page — the only place
 * it is ever used — and stays cached after that.
 */
const MainAnimConverter = lazy(() =>
  import("./MainAnimConverter").then((m) => ({ default: m.MainAnimConverter })),
);

type Mode = "mainAnim" | "dialogue";

/**
 * The "DIY assets" panel.
 *
 * The two tools used to be standalone cards stacked on top of each other, and
 * each one repeated the same eyebrow, the same card chrome and the same
 * title-then-lead shape — which read as one block duplicated. They now share a
 * single heading and switch through a segmented control, so the eyebrow appears
 * once and only one tool is expanded at a time.
 *
 * The animation tool leads and is open by default: on the device it is the
 * screen you look at first, so it is the one people come here to change.
 */
export function SelfMadeAssets() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("mainAnim");

  // Both panels stay mounted and are toggled with `hidden` rather than being
  // unmounted: flipping between the two must not throw away a file that has
  // already been picked.
  const tabs: { id: Mode; label: string; meta: string }[] = [
    {
      id: "mainAnim",
      label: t("sections.assets.selfMade.tabMainAnim"),
      meta: t("sections.assets.selfMade.tabMainAnimMeta"),
    },
    {
      id: "dialogue",
      label: t("sections.assets.selfMade.tabDialogue"),
      meta: t("sections.assets.selfMade.tabDialogueMeta"),
    },
  ];

  return (
    <div className="mt-14 rounded-2xl border border-border/50 bg-card/30 p-4 backdrop-blur sm:p-6">
      <span className="font-[Manrope] text-[11px] font-semibold tracking-[0.16em] text-[oklch(0.78_0.12_75)]">
        {t("sections.assets.selfMade.eyebrow")}
      </span>
      <p className="mt-2 max-w-2xl text-pretty text-sm leading-7 text-foreground/75">
        {t("sections.assets.selfMade.lead")}
      </p>

      <div
        role="tablist"
        aria-label={t("sections.assets.selfMade.eyebrow")}
        className="mt-5 flex flex-wrap gap-2.5"
      >
        {tabs.map((tab) => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              id={`selfmade-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`selfmade-panel-${tab.id}`}
              onClick={() => setMode(tab.id)}
              className={cn(
                // Both targets stay equally present — only the selected one
                // takes the gold accent, the other keeps a readable outline.
                "flex flex-1 flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-colors sm:flex-none sm:min-w-[11.5rem]",
                "outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.78_0.12_75)]",
                active
                  ? "border-[oklch(0.78_0.12_75/0.5)] bg-[oklch(0.78_0.12_75/0.08)]"
                  : "border-border/70 bg-background/45 hover:border-foreground/25 hover:bg-background/60",
              )}
            >
              <span
                className={cn(
                  "font-[Manrope] text-sm font-semibold tracking-[-0.01em]",
                  active ? "text-[oklch(0.78_0.12_75)]" : "text-foreground/80",
                )}
              >
                {tab.label}
              </span>
              <code className="mt-0.5 font-mono text-[10px] text-foreground/45">{tab.meta}</code>
            </button>
          );
        })}
      </div>

      <div className="mt-6 border-t border-border/50 pt-6">
        <div
          id="selfmade-panel-mainAnim"
          role="tabpanel"
          aria-labelledby="selfmade-tab-mainAnim"
          hidden={mode !== "mainAnim"}
        >
          <Suspense
            fallback={
              <div className="h-44 rounded-xl border border-border/40 bg-background/20" aria-hidden />
            }
          >
            <MainAnimConverter />
          </Suspense>
        </div>

        <div
          id="selfmade-panel-dialogue"
          role="tabpanel"
          aria-labelledby="selfmade-tab-dialogue"
          hidden={mode !== "dialogue"}
        >
          <DialogueBgConverter />
        </div>
      </div>
    </div>
  );
}
