import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AlertCircle, AlertTriangle, Check, Download, Loader2, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/soulpod";
import { DEVICE_PATHS, DIALOGUE_CHARACTERS, formatBytes } from "@/lib/device-assets";
import {
  decodeMainAnimFrame,
  frameBudget,
  frameFileName,
  MAIN_ANIM_FPS,
  MAIN_ANIM_MARKER_FILE,
  MAIN_ANIM_SIZE,
  verifyMainAnimFrame,
} from "@/lib/main-anim-encoder";
import {
  canDecodeAnimation,
  convertToDeviceFrames,
  ConvertError,
  type ConvertResult,
} from "@/lib/main-anim-convert";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PathLine } from "./shared";

/** Frame-count presets, expressed as the playback duration they produce at 24 FPS. */
const FRAME_LIMIT_CHOICES = [24, 48, 96, 512] as const;

const ACCEPTED_TYPES =
  "image/gif,image/png,image/jpeg,image/jpg,image/webp,image/avif,image/bmp";

/* ------------------------------------------------------------------ */

export function MainAnimConverter() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const reduceMotion = useReducedMotion();

  const [roleKey, setRoleKey] = useState("xia-yizhou");
  const [frameLimit, setFrameLimit] = useState<number>(48);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [check, setCheck] = useState<{ ok: number; bad: number } | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [zipping, setZipping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const role = DIALOGUE_CHARACTERS.find((c) => c.key === roleKey);
  const displayName = isZh ? (role?.name ?? roleKey) : (role?.enName ?? roleKey);
  const targetPath = DEVICE_PATHS.mainAnim(roleKey);
  const budget = useMemo(
    () => (result ? frameBudget(result.frames.length, MAIN_ANIM_SIZE) : null),
    [result],
  );

  /* ---------------- preview playback ---------------- */

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;

    canvas.width = MAIN_ANIM_SIZE;
    canvas.height = MAIN_ANIM_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, MAIN_ANIM_SIZE, MAIN_ANIM_SIZE);
    if (!result || result.frames.length === 0) return;

    const drawFrame = (index: number) => {
      const frame = result.frames[index];
      if (!frame) return;
      try {
        // Decoding the real bytes (rather than reusing the source image) is the
        // point: what is previewed is exactly what the device will show.
        const decoded = decodeMainAnimFrame(frame);
        ctx.putImageData(new ImageData(decoded.rgba, decoded.width, decoded.height), 0, 0);
      } catch {
        /* a malformed frame already surfaces through the self-check */
      }
    };

    drawFrame(0);
    if (reduceMotion || result.frames.length < 2) return;

    const interval = 1000 / MAIN_ANIM_FPS;
    let raf = 0;
    let index = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const elapsed = now - last;
      if (elapsed >= interval) {
        last = now - (elapsed % interval);
        index = (index + 1) % result.frames.length;
        drawFrame(index);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result, reduceMotion]);

  /* ---------------- conversion ---------------- */

  const describeError = useCallback(
    (e: unknown): string => {
      if (e instanceof ConvertError) {
        switch (e.code) {
          case "unsupportedType":
            return t("sections.assets.mainAnim.error.unsupportedType");
          case "tooBig":
            return t("sections.assets.mainAnim.error.tooBig");
          case "animationUnsupported":
            return t("sections.assets.mainAnim.error.animationUnsupported");
          case "aborted":
            return t("sections.assets.mainAnim.error.aborted");
          default:
            return t("sections.assets.mainAnim.error.decodeFailed", {
              message: e.detail ?? e.code,
            });
        }
      }
      return t("sections.assets.mainAnim.error.decodeFailed", {
        message: e instanceof Error ? e.message : String(e),
      });
    },
    [t],
  );

  const processFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      setResult(null);
      setCheck(null);
      setProgress(null);
      setSourceName(file.name);

      try {
        const converted = await convertToDeviceFrames(file, {
          size: MAIN_ANIM_SIZE,
          maxFrames: frameLimit,
          onProgress: (done, total) => setProgress({ done, total }),
        });

        // Self-check every frame before offering the download: decode → re-encode
        // → compare bytes. Catches any container or byte-order mistake here
        // rather than on the device.
        let ok = 0;
        let bad = 0;
        for (const frame of converted.frames) {
          if (verifyMainAnimFrame(frame).ok) ok++;
          else bad++;
        }

        setResult(converted);
        setCheck({ ok, bad });
      } catch (e) {
        setError(describeError(e));
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [describeError, frameLimit],
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

  async function handleDownload() {
    if (!result) return;
    setZipping(true);
    setError(null);
    try {
      // JSZip is already a dependency of this project (the SoulPod download
      // uses it the same way, loaded on demand) — reused rather than
      // reimplementing a small archive writer.
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      result.frames.forEach((buf, index) => {
        zip.file(frameFileName(index), new Uint8Array(buf));
      });
      // Zero-byte marker. Without it the device would keep playing an existing
      // main.eaf and never look at these frames.
      zip.file(MAIN_ANIM_MARKER_FILE, new Uint8Array(0));
      const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      downloadBlob(blob, `main-anim-${roleKey}.zip`);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setZipping(false);
    }
  }

  const frameLimitLabel = (value: number): string => {
    if (value === 512) return t("sections.assets.mainAnim.limitAll", { max: 512 });
    return t("sections.assets.mainAnim.limitFrames", {
      count: value,
      seconds: (value / MAIN_ANIM_FPS).toFixed(0),
    });
  };

  return (
    <div>
      <p className="max-w-2xl text-pretty text-sm leading-7 text-foreground/75">
        {t("sections.assets.mainAnim.lead")}
      </p>

      {!canDecodeAnimation() && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-[oklch(0.78_0.12_75/0.3)] bg-[oklch(0.78_0.12_75/0.07)] px-3 py-2 text-[11px] leading-5 text-foreground/70">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.78_0.12_75)]" aria-hidden />
          {t("sections.assets.mainAnim.unsupportedBrowser")}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left: target + limits + upload */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label
              htmlFor="main-anim-role"
              className="font-[Manrope] text-xs font-medium text-foreground/85"
            >
              {t("sections.assets.mainAnim.targetRole")}
            </label>
            <NativeSelect
              id="main-anim-role"
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value)}
              aria-label={t("sections.assets.mainAnim.targetRole")}
            >
              {DIALOGUE_CHARACTERS.map((c) => (
                <NativeSelectOption key={c.key} value={c.key}>
                  {isZh ? c.name : c.enName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label
              htmlFor="main-anim-limit"
              className="font-[Manrope] text-xs font-medium text-foreground/85"
            >
              {t("sections.assets.mainAnim.frameLimit")}
            </label>
            <NativeSelect
              id="main-anim-limit"
              value={String(frameLimit)}
              onChange={(e) => setFrameLimit(Number(e.target.value))}
              aria-label={t("sections.assets.mainAnim.frameLimit")}
            >
              {FRAME_LIMIT_CHOICES.map((value) => (
                <NativeSelectOption key={value} value={String(value)}>
                  {frameLimitLabel(value)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label={t("sections.assets.mainAnim.chooseFile")}
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
                ? t("sections.assets.mainAnim.converting", {
                    done: progress.done,
                    total: progress.total,
                  })
                : dragOver
                  ? t("sections.assets.mainAnim.dropHintActive")
                  : t("sections.assets.mainAnim.dropHint")}
            </p>
            <p className="mt-1 text-[10px] text-foreground/45">
              {t("sections.assets.mainAnim.chooseFile")}
            </p>
            <input
              ref={fileInputRef}
              id="main-anim-input"
              type="file"
              accept={ACCEPTED_TYPES}
              aria-label={t("sections.assets.mainAnim.chooseFile")}
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
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-foreground/50">
              {t("sections.assets.mainAnim.previewTitle")}
            </p>
            <div className="mx-auto flex aspect-square w-full max-w-[16rem] items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-[oklch(0.21_0.02_262)] px-1 py-1">
              {result ? (
                <canvas
                  ref={previewRef}
                  className="max-h-full max-w-full"
                  aria-label={t("sections.assets.mainAnim.previewTitle")}
                />
              ) : (
                <span className="text-[10px] text-foreground/35">
                  {t("sections.assets.mainAnim.previewEmpty")}
                </span>
              )}
            </div>
          </div>

          {result && budget && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] leading-5 text-foreground/65">
                <span className="text-foreground/50">
                  {t("sections.assets.mainAnim.statsSource")}
                </span>
                <span>
                  {result.animated
                    ? t("sections.assets.mainAnim.sourceAnimated", {
                        count: result.sourceFrameCount,
                        width: result.sourceWidth,
                        height: result.sourceHeight,
                      })
                    : t("sections.assets.mainAnim.sourceStill", {
                        width: result.sourceWidth,
                        height: result.sourceHeight,
                      })}
                </span>

                <span className="text-foreground/50">
                  {t("sections.assets.mainAnim.statsExport")}
                </span>
                <span>
                  {t("sections.assets.mainAnim.exportFrames", { count: result.frames.length })} ·{" "}
                  {t("sections.assets.mainAnim.exportDuration", {
                    seconds: budget.durationSeconds.toFixed(1),
                  })}
                </span>

                <span className="text-foreground/50">
                  {t("sections.assets.mainAnim.statsPerFrame")}
                </span>
                <span>{formatBytes(budget.bytesPerFrame)}</span>

                <span className="text-foreground/50">
                  {t("sections.assets.mainAnim.statsTotal")}
                </span>
                <span>{formatBytes(budget.totalBytes)}</span>
              </div>

              {result.sourceDurationSeconds !== null && result.animated && (
                <p className="text-[11px] leading-5 text-foreground/50">
                  {t("sections.assets.mainAnim.sourceTiming", {
                    source: result.sourceDurationSeconds.toFixed(1),
                    device: budget.durationSeconds.toFixed(1),
                    fps: MAIN_ANIM_FPS,
                  })}
                </p>
              )}

              {/* Firmware-limit guidance, three tiers */}
              <p
                className={cn(
                  "flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] leading-5",
                  budget.tier === "rejected"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : budget.tier === "streaming"
                      ? "border-[oklch(0.78_0.12_75/0.3)] bg-[oklch(0.78_0.12_75/0.07)] text-foreground/70"
                      : "border-border/50 bg-background/40 text-foreground/65",
                )}
              >
                {budget.tier === "rejected" ? (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : budget.tier === "streaming" ? (
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.78_0.12_75)]"
                    aria-hidden
                  />
                ) : (
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.78_0.12_75)]"
                    aria-hidden
                  />
                )}
                {budget.reasonKey === "tooManyFrames"
                  ? t("sections.assets.mainAnim.budget.tooManyFrames", { max: 512 })
                  : budget.reasonKey === "frameTooLarge"
                    ? t("sections.assets.mainAnim.budget.frameTooLarge", {
                        size: formatBytes(budget.bytesPerFrame),
                      })
                    : budget.reasonKey === "streaming"
                      ? t("sections.assets.mainAnim.budget.streaming", {
                          frames: budget.cacheableFrames,
                        })
                      : t("sections.assets.mainAnim.budget.ok", {
                          frames: budget.cacheableFrames,
                        })}
              </p>

              {check && (
                <p className="text-[11px] leading-5 text-foreground/50">
                  {check.bad === 0
                    ? t("sections.assets.mainAnim.checkOk", { count: check.ok })
                    : t("sections.assets.mainAnim.checkFail", {
                        count: check.bad,
                        total: check.ok + check.bad,
                      })}
                </p>
              )}

              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <span className="text-[11px] text-foreground/65">
                  <span className="text-foreground/50">
                    {t("sections.assets.mainAnim.targetRole")}:{" "}
                  </span>
                  {displayName}
                </span>
                <PathLine path={targetPath} />
              </div>

              <p className="text-[10px] leading-4 text-foreground/45">
                {t("sections.assets.mainAnim.markerNote", { marker: MAIN_ANIM_MARKER_FILE })}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={!result || busy || zipping || budget?.tier === "rejected"}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors",
              "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)] hover:bg-[oklch(0.82_0.12_75)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {zipping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {zipping
              ? t("sections.assets.mainAnim.zipping")
              : t("sections.assets.mainAnim.download")}
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
