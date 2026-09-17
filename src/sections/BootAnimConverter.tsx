import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Download,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toBlobPart } from "@/lib/bytes";
import { downloadBlob } from "@/lib/soulpod";
import { DEVICE_PATHS, formatBytes } from "@/lib/device-assets";
import {
  BOOT_ANIM_FPS,
  BOOT_ANIM_SIZE,
  BOOT_EAF_READ_MAX,
  EAF_ENC_JPEG,
  EAF_ENC_RLE,
  bootBudget,
  decodeEafFrames,
  verifyEaf,
  type BootEncoding,
} from "@/lib/eaf-encoder";
import {
  BOOT_FRAME_CHOICES,
  convertToBootAnimation,
  type BootConvertResult,
} from "@/lib/boot-anim-convert";
import { ConvertError, canDecodeAnimation } from "@/lib/main-anim-convert";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PathLine } from "./shared";

const ACCEPTED_TYPES =
  "image/gif,image/png,image/jpeg,image/jpg,image/webp,image/avif,image/bmp";

interface PreviewFrame {
  width: number;
  height: number;
  rgb: Uint8Array;
}

/* ------------------------------------------------------------------ */

/**
 * The boot-animation tool.
 *
 * Two things make this slot different from the main-screen one, and the UI
 * states both rather than leaving them to be discovered on the device:
 *
 *   1. It plays **once** and holds the last frame — it does not loop. The
 *      preview mirrors that exactly, with an explicit replay control.
 *   2. The destination path is a single fixed file with no character in it.
 *      The boot animation is system-level, so there is no role picker here.
 *
 * There is also no soft-failure tier. Over the 8 MB read ceiling the firmware
 * drops the animation silently, so oversize is shown as an error and the
 * download is disabled — unlike the main screen, which merely degrades to
 * streaming from the card.
 */
export function BootAnimConverter() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const [file, setFile] = useState<File | null>(null);
  const [encoding, setEncoding] = useState<BootEncoding>("rle");
  const [frameLimit, setFrameLimit] = useState<number>(48);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<BootConvertResult | null>(null);
  const [check, setCheck] = useState<{ ok: boolean; error?: string } | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewFrames, setPreviewFrames] = useState<PreviewFrame[] | null>(null);
  const [replayNonce, setReplayNonce] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const budget = result ? bootBudget(result.bytes.length, result.frameCount) : null;
  const perFrame = result && result.frameCount > 0 ? result.bytes.length / result.frameCount : 0;

  /* ---------------- preview decode ---------------- */

  // Decoding the generated file — rather than replaying the source — is the
  // point: a container or palette mistake would show up in the preview.
  useEffect(() => {
    if (!result) {
      setPreviewFrames(null);
      return;
    }
    let cancelled = false;
    setPreviewFrames(null);
    decodeEafFrames(result.bytes)
      .then((frames) => {
        if (!cancelled) setPreviewFrames(frames);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setPreviewFrames(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [result]);

  /* ---------------- preview playback ---------------- */

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !previewFrames || previewFrames.length === 0) return;

    const first = previewFrames[0]!;
    canvas.width = first.width;
    canvas.height = first.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // One reusable ImageData: rebuilding 129,600 pixels' worth of object per
    // frame would cost more than the decode itself.
    const image = ctx.createImageData(first.width, first.height);
    const draw = (index: number) => {
      const frame = previewFrames[index];
      if (!frame) return;
      const d = image.data;
      const n = frame.width * frame.height;
      for (let i = 0; i < n; i++) {
        d[i * 4] = frame.rgb[i * 3]!;
        d[i * 4 + 1] = frame.rgb[i * 3 + 1]!;
        d[i * 4 + 2] = frame.rgb[i * 3 + 2]!;
        d[i * 4 + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
    };

    draw(0);
    if (reduceMotion || previewFrames.length < 2) return;

    const interval = 1000 / BOOT_ANIM_FPS;
    let raf = 0;
    let index = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const elapsed = now - last;
      if (elapsed >= interval) {
        last = now - (elapsed % interval);
        index++;
        if (index >= previewFrames.length) {
          // The firmware plays a boot animation once and holds the last frame.
          draw(previewFrames.length - 1);
          return;
        }
        draw(index);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [previewFrames, reduceMotion, replayNonce]);

  /* ---------------- conversion ---------------- */

  const describeError = useCallback(
    (e: unknown): string => {
      if (e instanceof ConvertError) {
        switch (e.code) {
          case "unsupportedType":
            return t("sections.assets.bootAnim.error.unsupportedType");
          case "tooBig":
            return t("sections.assets.bootAnim.error.tooBig");
          case "animationUnsupported":
            return t("sections.assets.bootAnim.error.animationUnsupported");
          case "aborted":
            return t("sections.assets.bootAnim.error.aborted");
          default:
            return t("sections.assets.bootAnim.error.decodeFailed", {
              message: e.detail ?? e.code,
            });
        }
      }
      return t("sections.assets.bootAnim.error.decodeFailed", {
        message: e instanceof Error ? e.message : String(e),
      });
    },
    [t],
  );

  const processFile = useCallback(
    async (picked: File, nextEncoding: BootEncoding, nextLimit: number) => {
      setBusy(true);
      setError(null);
      setResult(null);
      setCheck(null);
      setProgress(null);
      setSourceName(picked.name);

      try {
        const converted = await convertToBootAnimation(picked, {
          encoding: nextEncoding,
          maxFrames: nextLimit,
          onProgress: (done, total) => setProgress({ done, total }),
        });

        // Self-check before offering the download. This slot fails silently on
        // the device, so an unverified file is worse than no file at all.
        const verification = verifyEaf(
          converted.bytes,
          nextEncoding === "jpeg" ? EAF_ENC_JPEG : EAF_ENC_RLE,
        );

        setResult(converted);
        setCheck(verification.ok ? { ok: true } : { ok: false, error: verification.error });
      } catch (e) {
        setError(describeError(e));
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [describeError],
  );

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      void processFile(picked, encoding, frameLimit);
    }
    if (e.target) e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const picked = e.dataTransfer.files?.[0];
    if (picked) {
      setFile(picked);
      void processFile(picked, encoding, frameLimit);
    }
  }

  // Changing either control re-runs the whole encode. The source File is kept
  // for exactly this: re-decoding the GIF is the only way to re-encode, and
  // asking the user to drop the file again would be worse.
  function changeEncoding(next: BootEncoding) {
    setEncoding(next);
    if (file) void processFile(file, next, frameLimit);
  }

  function changeFrameLimit(next: number) {
    setFrameLimit(next);
    if (file) void processFile(file, encoding, next);
  }

  function handleDownload() {
    if (!result) return;
    downloadBlob(
      new Blob([toBlobPart(result.bytes)], { type: "application/octet-stream" }),
      "boot.eaf",
    );
  }

  const frameLimitLabel = (value: number): string =>
    t("sections.assets.bootAnim.limitFrames", {
      count: value,
      seconds: (value / BOOT_ANIM_FPS).toFixed(0),
    });

  return (
    <div>
      <p className="max-w-2xl text-pretty text-sm leading-7 text-foreground/75">
        {t("sections.assets.bootAnim.lead")}
      </p>

      {!canDecodeAnimation() && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-[oklch(0.78_0.12_75/0.3)] bg-[oklch(0.78_0.12_75/0.07)] px-3 py-2 text-[11px] leading-5 text-foreground/70">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.78_0.12_75)]" aria-hidden />
          {t("sections.assets.bootAnim.unsupportedBrowser")}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left: encoding + limits + upload */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label
              htmlFor="boot-encoding"
              className="font-[Manrope] text-xs font-medium text-foreground/85"
            >
              {t("sections.assets.bootAnim.encoding")}
            </label>
            <NativeSelect
              id="boot-encoding"
              value={encoding}
              onChange={(e) => changeEncoding(e.target.value as BootEncoding)}
              aria-label={t("sections.assets.bootAnim.encoding")}
            >
              <NativeSelectOption value="rle">
                {t("sections.assets.bootAnim.encodingRle")}
              </NativeSelectOption>
              <NativeSelectOption value="jpeg">
                {t("sections.assets.bootAnim.encodingJpeg")}
              </NativeSelectOption>
            </NativeSelect>
          </div>

          <p className="text-[11px] leading-5 text-foreground/50">
            {encoding === "rle"
              ? t("sections.assets.bootAnim.encodingRleNote")
              : t("sections.assets.bootAnim.encodingJpegNote")}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label
              htmlFor="boot-limit"
              className="font-[Manrope] text-xs font-medium text-foreground/85"
            >
              {t("sections.assets.bootAnim.frameLimit")}
            </label>
            <NativeSelect
              id="boot-limit"
              value={String(frameLimit)}
              onChange={(e) => changeFrameLimit(Number(e.target.value))}
              aria-label={t("sections.assets.bootAnim.frameLimit")}
            >
              {BOOT_FRAME_CHOICES.map((value) => (
                <NativeSelectOption key={value} value={String(value)}>
                  {frameLimitLabel(value)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label={t("sections.assets.bootAnim.chooseFile")}
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
              {busy && progress
                ? t("sections.assets.bootAnim.converting", {
                    done: progress.done,
                    total: progress.total,
                  })
                : dragOver
                  ? t("sections.assets.bootAnim.dropHintActive")
                  : t("sections.assets.bootAnim.dropHint")}
            </p>
            <p className="mt-1 text-[10px] text-foreground/45">
              {t("sections.assets.bootAnim.chooseFile")}
            </p>
            <input
              ref={fileInputRef}
              id="boot-anim-input"
              type="file"
              accept={ACCEPTED_TYPES}
              aria-label={t("sections.assets.bootAnim.chooseFile")}
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>

          {sourceName && (
            <p className="truncate font-mono text-[10px] text-foreground/40" title={sourceName}>
              {sourceName}
            </p>
          )}
        </div>

        {/* Right: device preview + stats + download */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-foreground/50">
                {t("sections.assets.bootAnim.previewTitle")}
              </p>
              {previewFrames && previewFrames.length > 1 && (
                <button
                  type="button"
                  onClick={() => setReplayNonce((n) => n + 1)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-foreground/55 transition-colors hover:bg-background/50 hover:text-foreground/80"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  {t("sections.assets.bootAnim.replay")}
                </button>
              )}
            </div>
            <div className="mx-auto flex aspect-square w-full max-w-[16rem] items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-[oklch(0.21_0.02_262)] px-1 py-1">
              {previewFrames ? (
                <canvas
                  ref={previewRef}
                  className="max-h-full max-w-full"
                  aria-label={t("sections.assets.bootAnim.previewTitle")}
                />
              ) : (
                <span className="text-[10px] text-foreground/35">
                  {t("sections.assets.bootAnim.previewEmpty")}
                </span>
              )}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-foreground/45">
              {t("sections.assets.bootAnim.playsOnce")}
            </p>
          </div>

          {result && budget && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] leading-5 text-foreground/65">
                <span className="text-foreground/50">
                  {t("sections.assets.bootAnim.statsSource")}
                </span>
                <span>
                  {result.animated
                    ? t("sections.assets.bootAnim.sourceAnimated", {
                        count: result.sourceFrameCount,
                        width: result.sourceWidth,
                        height: result.sourceHeight,
                      })
                    : t("sections.assets.bootAnim.sourceStill", {
                        width: result.sourceWidth,
                        height: result.sourceHeight,
                      })}
                </span>

                <span className="text-foreground/50">
                  {t("sections.assets.bootAnim.statsExport")}
                </span>
                <span>
                  {t("sections.assets.bootAnim.exportFrames", { count: result.frameCount })} ·{" "}
                  {t("sections.assets.bootAnim.exportDuration", {
                    seconds: budget.durationSeconds.toFixed(1),
                  })}
                </span>

                <span className="text-foreground/50">
                  {t("sections.assets.bootAnim.statsPerFrame")}
                </span>
                <span>{formatBytes(Math.round(perFrame))}</span>

                <span className="text-foreground/50">
                  {t("sections.assets.bootAnim.statsTotal")}
                </span>
                <span>{formatBytes(budget.totalBytes)}</span>
              </div>

              {result.sourceDurationSeconds !== null && result.animated && (
                <p className="text-[11px] leading-5 text-foreground/50">
                  {t("sections.assets.bootAnim.sourceTiming", {
                    source: result.sourceDurationSeconds.toFixed(1),
                    device: budget.durationSeconds.toFixed(1),
                    fps: BOOT_ANIM_FPS,
                  })}
                </p>
              )}

              {/* The boot slot has no soft-failure tier: over the ceiling the
                  animation is dropped with no message on the device. */}
              <p
                className={cn(
                  "flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] leading-5",
                  budget.withinLimit
                    ? "border-border/50 bg-background/40 text-foreground/65"
                    : "border-destructive/40 bg-destructive/10 text-destructive",
                )}
              >
                {budget.withinLimit ? (
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.78_0.12_75)]"
                    aria-hidden
                  />
                ) : (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                {budget.withinLimit
                  ? t("sections.assets.bootAnim.budgetOk", {
                      size: formatBytes(budget.totalBytes),
                      max: formatBytes(BOOT_EAF_READ_MAX),
                    })
                  : t("sections.assets.bootAnim.budgetOver", {
                      size: formatBytes(budget.totalBytes),
                      max: formatBytes(BOOT_EAF_READ_MAX),
                    })}
              </p>

              {check && (
                <p className="text-[11px] leading-5 text-foreground/50">
                  {check.ok
                    ? t("sections.assets.bootAnim.checkOk", { count: result.frameCount })
                    : t("sections.assets.bootAnim.checkFail", { message: check.error ?? "" })}
                </p>
              )}

              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <PathLine path={DEVICE_PATHS.boot} />
              </div>

              <p className="text-[10px] leading-4 text-foreground/45">
                {t("sections.assets.bootAnim.pathNote", { size: BOOT_ANIM_SIZE })}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={!result || busy || !budget?.withinLimit || check?.ok === false}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors",
              "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)] hover:bg-[oklch(0.82_0.12_75)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Download className="h-3.5 w-3.5" />
            {t("sections.assets.bootAnim.download")}
          </button>

          {error && (
            <p className="flex items-start gap-1.5 text-[11px] leading-5 text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
