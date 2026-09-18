import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Download, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";
import { downloadBlob } from "@/lib/soulpod";
import {
  assetUrl,
  BOOT_ASSETS,
  DIALOGUE_CHARACTERS,
  formatBytes,
  type DeviceAssetEntry,
  type DeviceAssetFile,
} from "@/lib/device-assets";
import { PathLine, SectionEyebrow } from "./shared";
import { SelfMadeAssets } from "./SelfMadeAssets";

/* ------------------------------------------------------------------ */
/* Download button                                                     */
/* ------------------------------------------------------------------ */

function AssetDownload({ file }: { file: DeviceAssetFile }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleDownload() {
    try {
      setBusy(true);
      setErr(null);
      const resp = await fetch(assetUrl(file.publicPath));
      if (!resp.ok) {
        throw new Error(`${resp.status}`);
      }
      downloadBlob(await resp.blob(), file.fileName);
      setBusy(false);
    } catch (e) {
      setBusy(false);
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium transition-colors",
          "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)] hover:bg-[oklch(0.82_0.12_75)]",
          "disabled:cursor-wait disabled:opacity-70"
        )}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
        {busy ? t("sections.assets.downloading") : t("sections.assets.download")}
      </button>
      {err && <span className="text-[10px] text-destructive">×{err}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Entry card                                                          */
/* ------------------------------------------------------------------ */

function AssetCard({
  entry,
  title,
  kind,
  className,
}: {
  entry: DeviceAssetEntry;
  title: string;
  /**
   * Which slot the file replaces.
   *
   * This used to be a group heading sitting above the card. The cards are now
   * one grid instead of two stacked groups, so the label moved down onto the
   * card — same information, one less layer of vertical chrome.
   */
  kind: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const primary = entry.files[0];

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-border/50 bg-card/30 p-4 backdrop-blur",
        className
      )}
    >
      {/* 预览：素材本身多为深色星空，给一块略亮的垫底以免看起来是空卡 */}
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-[oklch(0.21_0.02_262)]">
        {entry.previewPath ? (
          <img
            src={assetUrl(entry.previewPath)}
            alt={title}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-[10px] leading-4 text-foreground/35">
            {t("sections.assets.noPreview")}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="font-[Manrope] text-sm font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h3>
        {primary && (
          <span className="mt-0.5 shrink-0 font-mono text-[10px] text-foreground/45">
            {formatBytes(primary.bytes)}
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-full border border-border/70 bg-background/25 px-2 py-px text-[10px] leading-4 text-foreground/55">
          {kind}
        </span>
        <span className="font-mono text-[10px] text-foreground/35">{entry.sourceSize}</span>
      </div>

      {/* 下载 / 仅预览 */}
      <div className="mt-3">
        {entry.files.length > 0 ? (
          entry.files.map((file) => <AssetDownload key={file.publicPath} file={file} />)
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[10px] text-foreground/45">
            {t("sections.assets.previewOnly")}
          </span>
        )}
      </div>

      <PathLine path={entry.targetPath} />

      {entry.noteKey && (
        <p className="mt-2 text-[10px] leading-4 text-foreground/45">
          {t(`sections.assets.notes.${entry.noteKey}`)}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function DeviceAssetsSection() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");

  return (
    <motion.section id="assets" className="scroll-mt-32 px-5" {...fadeUp}>
      <div className="mx-auto max-w-6xl">
        <SectionEyebrow>{t("sections.assets.eyebrow")}</SectionEyebrow>
        <h2 className="mt-3 font-[Manrope] text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
          {t("sections.assets.title")}
        </h2>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-7 text-foreground/75 md:text-[0.975rem] md:leading-8">
          {t("sections.assets.lead")}
        </p>

        {/* 生效方式 */}
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-[oklch(0.78_0.12_75/0.3)] bg-[oklch(0.78_0.12_75/0.07)] px-4 py-3">
          <span className="font-[Manrope] text-[11px] font-semibold tracking-[0.16em] text-[oklch(0.78_0.12_75)]">
            {t("sections.assets.howToTitle")}
          </span>
          <span className="text-[11px] leading-5 text-foreground/65">
            {t("sections.assets.howTo")}
          </span>
        </div>

        {/*
          Ready-made assets share one grid.

          They used to be two headed groups stacked on top of each other, which
          spent two headings and two layers of vertical spacing on three cards
          — and the headings' target paths duplicated each card's own PathLine.
          The type label now sits on the card, so the grid holds all three.

          Mobile keeps two columns: the boot card spans the full row (it is the
          only one with a note, and it is the one most people want), and the two
          dialogue backgrounds sit side by side instead of eating a second
          screen.
        */}
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          {BOOT_ASSETS.map((entry) => (
            <AssetCard
              key={entry.id}
              className="col-span-2 lg:col-span-1"
              entry={entry}
              title={t(`sections.assets.boot.${entry.labelKey}`)}
              kind={t("sections.assets.bootGroupTitle")}
            />
          ))}
          {DIALOGUE_CHARACTERS.map((character) => (
            <AssetCard
              key={character.key}
              entry={character.entry}
              title={isZh ? character.name : character.enName}
              kind={t("sections.assets.dialogueGroupTitle")}
            />
          ))}
        </div>

        {/* 自制素材：对话底图 / 主屏动画（同一面板内的两个模式） */}
        <SelfMadeAssets />

        {/* 格式规范 */}
        <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-2 border-t border-border/40 pt-6 text-[11px] leading-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex gap-2">
            <dt className="shrink-0 text-foreground/40">{t("sections.assets.spec.format")}</dt>
            <dd className="text-foreground/65">{t("sections.assets.spec.formatValue")}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-foreground/40">{t("sections.assets.spec.bootSize")}</dt>
            <dd className="text-foreground/65">{t("sections.assets.spec.bootSizeValue")}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-foreground/40">{t("sections.assets.spec.dialogueSize")}</dt>
            <dd className="text-foreground/65">{t("sections.assets.spec.dialogueSizeValue")}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-foreground/40">{t("sections.assets.spec.mainAnimSize")}</dt>
            <dd className="text-foreground/65">{t("sections.assets.spec.mainAnimSizeValue")}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-foreground/40">{t("sections.assets.spec.fps")}</dt>
            <dd className="text-foreground/65">{t("sections.assets.spec.fpsValue")}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-foreground/40">{t("sections.assets.spec.limit")}</dt>
            <dd className="text-foreground/65">{t("sections.assets.spec.limitValue")}</dd>
          </div>
        </dl>
      </div>
    </motion.section>
  );
}
