import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Download, Loader2, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/soulpod";
import {
  DEVICE_PATHS,
  DIALOGUE_BG_BYTES,
  DIALOGUE_CHARACTERS,
  formatBytes,
} from "@/lib/device-assets";
import { decodeDialogueBg, DIALOGUE_BG_SIZE, encodeDialogueBg } from "@/lib/dialogue-bg-encoder";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PathLine } from "./shared";

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

/**
 * Body of the "dialogue background" mode.
 *
 * Renders content only — the surrounding panel, the eyebrow and the mode
 * switcher all belong to `SelfMadeAssets`, so that the two DIY tools share a
 * single heading instead of repeating the same one twice.
 */
export function DialogueBgConverter() {
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
    <div>
      <p className="max-w-2xl text-pretty text-sm leading-7 text-foreground/75">
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
                  <span className="text-foreground/50">
                    {t("sections.assets.converter.fileNameLabel")}:{" "}
                  </span>
                  dialogue_bg.bin
                </span>
                <span>
                  <span className="text-foreground/50">
                    {t("sections.assets.converter.sizeLabel")}:{" "}
                  </span>
                  {formatBytes(DIALOGUE_BG_BYTES)}
                </span>
                <span>
                  <span className="text-foreground/50">
                    {t("sections.assets.converter.targetRole")}:{" "}
                  </span>
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
