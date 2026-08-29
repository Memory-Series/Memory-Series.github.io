import { useRef, useState } from "react";
import { connect, type ESPLoader } from "tasmota-webserial-esptool";
import { useTranslation } from "react-i18next";
import { Loader2, Plug, PlugZap, Radio, RotateCcw, Usb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FIRMWARE_URL = `${import.meta.env.BASE_URL}merged_binary/memory-series-1.85b.bin`;

type FlashState =
  | "idle"
  | "connecting"
  | "connected"
  | "downloading"
  | "flashing"
  | "success"
  | "error";

interface FlashToolProps {
  onProgress?: (phase: "download" | "write", pct: number) => void;
}

export function FlashTool({ onProgress }: FlashToolProps) {
  const { t } = useTranslation();
  const loaderRef = useRef<ESPLoader | null>(null);
  const [state, setState] = useState<FlashState>("idle");
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [flashSize, setFlashSize] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [webSerialSupported] = useState(() => typeof navigator !== "undefined" && "serial" in navigator);

  function setPhase(next: FlashState) {
    setState(next);
    if (next !== "downloading" && next !== "flashing") {
      setProgress(0);
    }
  }

  async function handleConnect() {
    if (!webSerialSupported) {
      return;
    }
    try {
      setPhase("connecting");
      setErrorMsg("");
      const loader = await connect({
        log: () => {},
        error: () => {},
        debug: () => {},
      });
      loaderRef.current = loader;
      setDeviceName(loader.chipName ?? "ESP32-S3");
      setFlashSize(loader.flashSize ? `${loader.flashSize} MB` : null);
      setPhase("connected");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  async function handleDisconnect() {
    try {
      await loaderRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    loaderRef.current = null;
    setDeviceName(null);
    setFlashSize(null);
    setPhase("idle");
  }

  async function handleFlash() {
    const loader = loaderRef.current;
    if (!loader) {
      return;
    }
    try {
      setErrorMsg("");
      setPhase("downloading");
      setProgress(0);

      // 1. Download merged firmware binary
      const resp = await fetch(FIRMWARE_URL);
      if (!resp.ok) {
        throw new Error(`Firmware download failed (${resp.status})`);
      }
      const blob = await resp.blob();
      const binary: ArrayBuffer = await blob.arrayBuffer();

      // 2. Write to flash at 0x0 (merged image contains bootloader + partitions + app)
      setPhase("flashing");
      setProgress(0);
      onProgress?.("download", 100);

      await loader.flashData(
        binary,
        (written, total) => {
          const pct = total > 0 ? Math.round((written / total) * 100) : 0;
          setProgress(pct);
          onProgress?.("write", pct);
        },
        0x0,
        true
      );

      setProgress(100);
      onProgress?.("write", 100);
      setPhase("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  const isBusy = state === "connecting" || state === "downloading" || state === "flashing";
  const isConnected = state === "connected" || state === "downloading" || state === "flashing" || state === "success";

  return (
    <Card className="mt-4 rounded-3xl border-border/50 bg-card/30 p-5 backdrop-blur md:p-7">
      <div className="space-y-6">
        {/* Lead */}
        <p className="text-pretty text-sm leading-7 text-foreground/75 md:text-[0.975rem] md:leading-8">
          {t("sections.flash.lead")}
        </p>

        {/* Support hint */}
        <p className="flex items-center gap-2 text-xs tracking-[0.2em] text-foreground/55">
          <span className="h-1 w-1 rounded-full bg-[oklch(0.78_0.12_75)]" aria-hidden />
          {t("sections.flash.supportHint")}
        </p>

        {/* Connection status */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border",
                isConnected
                  ? "border-[oklch(0.78_0.12_75)]/60 bg-[oklch(0.78_0.12_75)]/10 text-[oklch(0.78_0.12_75)]"
                  : "border-border/70 bg-background/25 text-foreground/55"
              )}
            >
              {isConnected ? <Usb className="h-4 w-4" /> : <Plug className="h-4 w-4" />}
            </span>
            <div>
              <p className="font-[Manrope] text-sm font-semibold tracking-[-0.02em] text-foreground">
                {isConnected ? t("sections.flash.connected") : t("sections.flash.notConnected")}
              </p>
              {deviceName && (
                <p className="text-xs leading-5 text-foreground/55">
                  {deviceName}
                  {flashSize ? ` · ${flashSize}` : ""}
                </p>
              )}
            </div>
          </div>

          {!webSerialSupported ? (
            <p className="text-sm leading-6 text-foreground/65">{t("sections.flash.unsupported")}</p>
          ) : isConnected ? (
            <Button type="button" variant="outline" onClick={() => void handleDisconnect()} disabled={isBusy}>
              {t("sections.flash.disconnect")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              onClick={() => void handleConnect()}
              disabled={isBusy}
              className="bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)] hover:bg-[oklch(0.82_0.12_75)]"
            >
              {state === "connecting" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlugZap className="mr-2 h-4 w-4" />
              )}
              {t("sections.flash.connect")}
            </Button>
          )}
        </div>

        {/* Firmware card */}
        <div className="rounded-2xl border border-border/50 bg-background/15 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs tracking-[0.2em] text-foreground/50">{t("sections.flash.firmwareLabel")}</p>
              <p className="font-[Manrope] text-sm font-semibold tracking-[-0.02em] text-foreground">
                {t("sections.flash.firmwareName")}
              </p>
              <p className="text-xs leading-5 text-foreground/55">
                {t("sections.flash.flashTarget")} · {t("sections.flash.flashOffset")}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => void handleFlash()}
              disabled={!isConnected || isBusy}
              className="bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)] hover:bg-[oklch(0.82_0.12_75)]"
            >
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
              {isBusy ? t("sections.flash.flashing") : t("sections.flash.startFlash")}
            </Button>
          </div>
        </div>

        {/* Progress */}
        {isBusy || state === "success" || state === "error" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span>
                {state === "downloading" && t("sections.flash.downloadProgress")}
                {state === "flashing" && t("sections.flash.writeProgress")}
                {state === "success" && t("sections.flash.flashSuccess")}
                {state === "error" && t("sections.flash.flashError")}
              </span>
              <span className="font-[Manrope] font-semibold tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/40">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-200",
                  state === "error"
                    ? "bg-destructive"
                    : "bg-[oklch(0.78_0.12_75)]"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            {state === "success" && (
              <div className="flex items-center gap-2 text-xs text-foreground/60">
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t("sections.flash.flashSuccess")}</span>
              </div>
            )}
            {state === "error" && <p className="text-xs leading-5 text-destructive">{errorMsg}</p>}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-xs text-foreground/50">
            <span className="h-1 w-1 rounded-full bg-foreground/40" aria-hidden />
            {t("sections.flash.statusIdle")}
          </p>
        )}
      </div>
    </Card>
  );
}
