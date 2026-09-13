import { useCallback, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, Copy, Download, Loader2, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";
import { downloadBlob } from "@/lib/soulpod";
import {
  assetUrl,
  BOOT_ASSETS,
  DEVICE_PATHS,
  DIALOGUE_CHARACTERS,
  DIALOGUE_BG_BYTES,
  formatBytes,
  type DeviceAssetEntry,
  type DeviceAssetFile,
} from "@/lib/device-assets";
import { decodeDialogueBg, DIALOGUE_BG_SIZE, encodeDialogueBg } from "@/lib/dialogue-bg-encoder";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SectionEyebrow } from "./shared";

/* ------------------------------------------------------------------ */
/* Copy-to-clipboard path line                                         */
/* ------------------------------------------------------------------ */

function PathLine({ path }: { path: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5">
      <code
        className="min-w-0 flex-1 truncate font-mono text-[10px] leading-4 text-foreground/60"
        title={path}
      >
        {path}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={t("sections.assets.copyPath")}
        title={t("sections.assets.copyPath")}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-foreground/45 transition-colors hover:bg-foreground/10 hover:text-foreground/80"
      >
        {copied ? (
          <Check className="h-3 w-3 text-[oklch(0.78_0.12_75)]" aria-hidden />
        ) : (
          <Copy className="h-3 w-3" aria-hidden />
        )}
      </button>
    </div>
  );
}

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

function AssetCard({ entry, title }: { entry: DeviceAssetEntry; title: string }) {
  const { t } = useTranslation();
  const primary = entry.files[0];

  return (
    <div className="relative flex flex-col rounded-2xl border border-border/50 bg-card/30 p-4 backdrop-blur">
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

        {/* 开机动画 */}
        <div className="mt-10">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-[Manrope] text-lg font-semibold tracking-[-0.02em] text-foreground">
              {t("sections.assets.bootGroupTitle")}
            </h3>
            <code className="font-mono text-[10px] text-foreground/45">
              {t("sections.assets.bootGroupMeta")}
            </code>
          </div>
          {/* 一期只有默认款，用受限宽度避免单卡被拉成整行留白 */}
          <div className="mt-4 grid max-w-sm grid-cols-1 items-start gap-4">
            {BOOT_ASSETS.map((entry) => (
              <AssetCard
                key={entry.id}
                entry={entry}
                title={t(`sections.assets.boot.${entry.labelKey}`)}
              />
            ))}
          </div>
        </div>

        {/* 对话气泡底图 */}
        <div className="mt-12">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-[Manrope] text-lg font-semibold tracking-[-0.02em] text-foreground">
              {t("sections.assets.dialogueGroupTitle")}
            </h3>
            <code className="font-mono text-[10px] text-foreground/45">
              {t("sections.assets.dialogueGroupMeta")}
            </code>
          </div>
          <div className="mt-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DIALOGUE_CHARACTERS.map((character) => (
              <AssetCard
                key={character.key}
                entry={character.entry}
                title={isZh ? character.name : character.enName}
              />
            ))}
          </div>
        </div>

        {/* 自制对话底图 */}
        <DialogueBgConverter />

        {/* 格式规范 */}
        <dl className="mt-10 grid grid-cols-1 gap-x-8 gap-y-2 border-t border-border/40 pt-6 text-[11px] leading-5 sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="shrink-0 text-foreground/40">{t("sections.assets.spec.format")}</dt>
            <dd className="text-foreground/65">{t("sections.assets.spec.formatValue")}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-foreground/40">{t("sections.assets.spec.dialogueSize")}</dt>
            <dd className="text-foreground/65">{t("sections.assets.spec.dialogueSizeValue")}</dd>
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

/* ------------------------------------------------------------------ */
/* Dialogue background converter                                       */
/* ------------------------------------------------------------------ */

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

function DialogueBgConverter() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");

  const [roleKey, setRoleKey] = useState("xia-yizhou");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [encoded, setEncoded] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deviceCanvasRef = useRef<HTMLCanvasElement>(null);

  const role = DIALOGUE_CHARACTERS.find((c) => c.key === roleKey);
  const targetPath = useMemo(
    () => DEVICE_PATHS.dialogueBg(roleKey === "custom" ? "<character>" : roleKey),
    [roleKey],
  );
  const displayName =
    roleKey === "custom"
      ? t("sections.assets.converter.customRole")
      : isZh
        ? (role?.name ?? roleKey)
        : (role?.enName ?? roleKey);

  const processFile = useCallback(
    async (file: File) => {
      if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
        setError(t("sections.assets.converter.error.noImage"));
        return;
      }
      if (file.size > 30 * 1024 * 1024) {
        setError(t("sections.assets.converter.error.tooBig"));
        return;
      }

      setBusy(true);
      setError(null);
      setEncoded(null);
      setSourceUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });

      try {
        const img = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("canvas context");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const bin = encodeDialogueBg(imageData.data, img.width, img.height, {
          size: DIALOGUE_BG_SIZE,
        });
        setEncoded(bin);

        // Round-trip to draw the exact decoded preview.
        const decoded = decodeDialogueBg(bin);
        const dc = deviceCanvasRef.current;
        if (dc) {
          dc.width = decoded.width;
          dc.height = decoded.height;
          const dctx = dc.getContext("2d", { willReadFrequently: true });
          if (dctx) {
            dctx.putImageData(
              new ImageData(decoded.rgba, decoded.width, decoded.height),
              0,
              0,
            );
          }
        }
        img.close();
      } catch (e) {
        setError(
          t("sections.assets.converter.error.decode", {
            message: e instanceof Error ? e.message : String(e),
          }),
        );
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    if (e.target) e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  function handleDownload() {
    if (!encoded) return;
    const blob = new Blob([encoded], { type: "application/octet-stream" });
    downloadBlob(blob, "dialogue_bg.bin");
  }

  return (
    <div className="mt-14 rounded-2xl border border-border/50 bg-card/30 p-4 backdrop-blur sm:p-6">
      <div className="flex items-center gap-2">
        <span className="font-[Manrope] text-[11px] font-semibold tracking-[0.16em] text-[oklch(0.78_0.12_75)]">
          {t("sections.assets.converter.eyebrow")}
        </span>
      </div>
      <h3 className="mt-2 font-[Manrope] text-lg font-semibold tracking-[-0.02em] text-foreground">
        {t("sections.assets.converter.title")}
      </h3>
      <p className="mt-2 max-w-2xl text-pretty text-sm leading-7 text-foreground/75">
        {t("sections.assets.converter.lead")}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left: role + upload */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="dialogue-role"
              className="font-[Manrope] text-xs font-medium text-foreground/85"
            >
              {t("sections.assets.converter.targetRole")}
            </label>
            <NativeSelect
              id="dialogue-role"
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value)}
              aria-label={t("sections.assets.converter.targetRole")}
            >
              {DIALOGUE_CHARACTERS.map((c) => (
                <NativeSelectOption key={c.key} value={c.key}>
                  {isZh ? c.name : c.enName}
                </NativeSelectOption>
              ))}
              <NativeSelectOption value="custom">
                {t("sections.assets.converter.customRole")}
              </NativeSelectOption>
            </NativeSelect>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label={t("sections.assets.converter.chooseFile")}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "relative flex min-h-[11rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.78_0.12_75)]",
              dragOver
                ? "border-[oklch(0.78_0.12_75)] bg-[oklch(0.78_0.12_75/0.07)]"
                : "border-border/50 bg-[oklch(0.21_0.02_262/0.5)] hover:border-[oklch(0.78_0.12_75/0.6)] hover:bg-[oklch(0.21_0.02_262/0.8)]",
            )}
          >
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin text-foreground/45" />
            ) : (
              <Upload className="h-6 w-6 text-foreground/45" />
            )}
            <p className="mt-3 text-sm text-foreground/75">
              {dragOver
                ? t("sections.assets.converter.dropHintActive")
                : t("sections.assets.converter.dropHint")}
            </p>
            <p className="mt-1 text-[10px] text-foreground/45">
              {t("sections.assets.converter.chooseFile")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>
        </div>

        {/* Right: preview + actions */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-foreground/50">
                {t("sections.assets.converter.sourceTitle")}
              </p>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-[oklch(0.21_0.02_262)]">
                {sourceUrl ? (
                  <img
                    src={sourceUrl}
                    alt={t("sections.assets.converter.sourceTitle")}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-foreground/35">—</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-foreground/50">
                {t("sections.assets.converter.devicePreviewTitle")}
              </p>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-[oklch(0.21_0.02_262)]">
                <canvas
                  ref={deviceCanvasRef}
                  className="max-h-full max-w-full object-contain"
                  aria-label={t("sections.assets.converter.devicePreviewTitle")}
                />
              </div>
            </div>
          </div>

          {encoded && (
            <div className="rounded-lg border border-border/50 bg-background/40 p-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-foreground/65">
                <span>
                  <span className="text-foreground/50">                  {t("sections.assets.converter.fileNameLabel")}: </span>
                  dialogue_bg.bin
                </span>
                <span>
                  <span className="text-foreground/50">{t("sections.assets.converter.sizeLabel")}: </span>
                  {formatBytes(DIALOGUE_BG_BYTES)}
                </span>
                <span>
                  <span className="text-foreground/50">{t("sections.assets.converter.targetRole")}: </span>
                  {displayName}
                </span>
              </div>
              <PathLine path={targetPath} />
            </div>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={!encoded || busy}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors",
              "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)] hover:bg-[oklch(0.82_0.12_75)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Download className="h-3.5 w-3.5" />
            {t("sections.assets.converter.download")}
          </button>

          {error && (
            <p className="flex items-center gap-1.5 text-[11px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
