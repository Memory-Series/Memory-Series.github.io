import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Loader2 } from "lucide-react";

import { buildSoulPodZip, downloadBlob, SOULPOD_MANIFEST } from "@/lib/soulpod";
import { cn } from "@/lib/utils";

interface SoulPodDownloadProps {
  /** Chinese character name (matches SOULPOD_MANIFEST.name). */
  characterName: string;
  /** Compact variant for inline use inside cards. */
  compact?: boolean;
}

export function SoulPodDownload({ characterName, compact }: SoulPodDownloadProps) {
  const { t } = useTranslation();
  const [packing, setPacking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const manifest = SOULPOD_MANIFEST.find((m) => m.name === characterName);
  const available = Boolean(manifest?.available);

  async function handleDownload() {
    if (!manifest?.available) {
      return;
    }
    try {
      setPacking(true);
      setMsg(null);
      setErr(null);
      const blob = await buildSoulPodZip(manifest);
      downloadBlob(blob, `${manifest.name}-SoulPod.zip`);
      setPacking(false);
      setMsg(t("sections.flash.soulpodReady"));
    } catch (e) {
      setPacking(false);
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  if (!available) {
    return (
      <span
        className={cn(
          "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[10px] text-foreground/45",
          compact && "text-[10px]"
        )}
      >
        <Download className="h-3 w-3" />
        {t("sections.flash.soulpodComingSoon")}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void handleDownload();
        }}
        disabled={packing}
        className={cn(
          "pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium transition-colors",
          "bg-[oklch(0.78_0.12_75)] text-[oklch(0.16_0.03_262)] hover:bg-[oklch(0.82_0.12_75)]",
          "disabled:cursor-wait disabled:opacity-70"
        )}
        aria-label={`下载${characterName}SoulPod`}
      >
        {packing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
        {packing ? t("sections.flash.soulpodDownloading") : t("sections.flash.deploySoulpod")}
      </button>
      {(msg || err) && (
        <p className={cn("mt-1 text-[10px] leading-4", err ? "text-destructive" : "text-foreground/55")}>
          {err ?? msg}
        </p>
      )}
    </>
  );
}
