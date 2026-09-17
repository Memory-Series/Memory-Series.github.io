import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { DialogueBgConverter } from "./DialogueBgConverter";

/**
 * Both converters are split into their own chunks.
 *
 * Between them they carry a GIF decoder pipeline, two device encoders and a
 * colour quantiser, and the initial bundle already sits close to Vite's 500 kB
 * warning threshold. Each is fetched when its tab is first opened and stays
 * cached after that.
 */
const BootAnimConverter = lazy(() =>
  import("./BootAnimConverter").then((m) => ({ default: m.BootAnimConverter })),
);
const MainAnimConverter = lazy(() =>
  import("./MainAnimConverter").then((m) => ({ default: m.MainAnimConverter })),
);

type Mode = "bootAnim" | "mainAnim" | "dialogue";

/**
 * The "DIY assets" panel.
 *
 * The tools used to be standalone cards stacked on top of each other, and each
 * one repeated the same eyebrow, the same card chrome and the same
 * title-then-lead shape — which read as one block duplicated. They now share a
 * single heading and switch through a segmented control, so the eyebrow appears
 * once and only one tool is expanded at a time.
 *
 * Order follows what you actually see on the device, first to last: the boot
 * animation, then the main screen, then the dialogue background. The first of
 * those is the default view for the same reason.
 */
export function SelfMadeAssets() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("bootAnim");

  /**
   * Which tabs have ever been opened.
   *
   * Keeping every panel mounted from the start would pull both chunks the
   * moment the panel scrolls into view; mounting on first open keeps the
   * initial cost to the default tab only. Once opened a panel stays mounted, so
   * switching away and back does not discard a file that was already picked.
   */
  const [opened, setOpened] = useState<Mode[]>(["bootAnim"]);

  const select = (next: Mode) => {
    setMode(next);
    setOpened((prev) => (prev.includes(next) ? prev : [...prev, next]));
  };

  // Every panel stays mounted once opened and is toggled with `hidden` rather
  // than being unmounted: flipping between tabs must not throw away a file that
  // has already been picked, nor re-fetch a chunk already loaded.
  const tabs: { id: Mode; label: string; meta: string }[] = [
    {
      id: "bootAnim",
      label: t("sections.assets.selfMade.tabBootAnim"),
      meta: t("sections.assets.selfMade.tabBootAnimMeta"),
    },
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

      {/*
        Three tabs no longer fit side by side on a phone: at 390 px each would
        get ~118 px, which is not enough for a label plus its file name. They
        stack on mobile — with each tab's own content on one line so the stack
        stays short — and go back to a horizontal row from `sm` up.
      */}
      <div
        role="tablist"
        aria-label={t("sections.assets.selfMade.eyebrow")}
        className="mt-5 grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap"
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
              onClick={() => select(tab.id)}
              className={cn(
                // All three targets stay equally present — only the selected one
                // takes the gold accent, the others keep a readable outline.
                "flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.78_0.12_75)]",
                "sm:flex-col sm:items-start sm:justify-start sm:min-w-[11.5rem]",
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
              <code className="font-mono text-[10px] text-foreground/45 sm:mt-0.5">{tab.meta}</code>
            </button>
          );
        })}
      </div>

      <div className="mt-6 border-t border-border/50 pt-6">
        {opened.includes("bootAnim") && (
          <div
            id="selfmade-panel-bootAnim"
            role="tabpanel"
            aria-labelledby="selfmade-tab-bootAnim"
            hidden={mode !== "bootAnim"}
          >
            <Suspense fallback={<PanelFallback />}>
              <BootAnimConverter />
            </Suspense>
          </div>
        )}

        {opened.includes("mainAnim") && (
          <div
            id="selfmade-panel-mainAnim"
            role="tabpanel"
            aria-labelledby="selfmade-tab-mainAnim"
            hidden={mode !== "mainAnim"}
          >
            <Suspense fallback={<PanelFallback />}>
              <MainAnimConverter />
            </Suspense>
          </div>
        )}

        {opened.includes("dialogue") && (
          <div
            id="selfmade-panel-dialogue"
            role="tabpanel"
            aria-labelledby="selfmade-tab-dialogue"
            hidden={mode !== "dialogue"}
          >
            <DialogueBgConverter />
          </div>
        )}
      </div>
    </div>
  );
}

function PanelFallback() {
  return <div className="h-44 rounded-xl border border-border/40 bg-background/20" aria-hidden />;
}
