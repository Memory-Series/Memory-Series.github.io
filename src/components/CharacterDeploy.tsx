import { useEffect, useRef, useState } from "react";
import { connect, type ESPLoader } from "tasmota-webserial-esptool";
import { useTranslation } from "react-i18next";
import { Check, ExternalLink, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const WIFI_STATUS_CMD = "wifi --status\n";
const WIFI_PROBE_ATTEMPTS = 3;
const WIFI_PROBE_TIMEOUT_MS = 1500;

type AddressState = "idle" | "probing" | "found" | "not_found" | "error";

function parseWifiStatus(line: string): string | null {
  if (!line.includes("CMD_WIFI:") || !line.includes("cmd=status") || !line.includes("ok=1")) {
    return null;
  }
  const ipMatch = line.match(/sta_ip=([0-9.-]+)/);
  if (!ipMatch) {
    return null;
  }
  const ip = ipMatch[1];
  return /^\d+\.\d+\.\d+\.\d+$/.test(ip) ? ip : null;
}

export function CharacterDeploy() {
  const { t } = useTranslation();
  const loaderRef = useRef<ESPLoader | null>(null);
  const [addressState, setAddressState] = useState<AddressState>("idle");
  const [deviceIp, setDeviceIp] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [webSerialSupported] = useState(() => typeof navigator !== "undefined" && "serial" in navigator);

  const addressRef = useRef<string | null>(null);
  const consoleReadingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (loaderRef.current) {
        void loaderRef.current.disconnect().catch(() => {});
      }
    };
  }, []);

  /** Read console output, resolving when an IP is parsed. */
  function startConsoleReader(onIp: (ip: string) => void) {
    const loader = loaderRef.current;
    if (!loader?.port.readable || consoleReadingRef.current) {
      return;
    }
    const reader = loader.port.readable.getReader();
    consoleReadingRef.current = true;
    const decoder = new TextDecoder();
    let buffer = "";

    void (async () => {
      try {
        while (consoleReadingRef.current) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          if (!value) {
            continue;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const ip = parseWifiStatus(line);
            if (ip) {
              onIp(ip);
              consoleReadingRef.current = false;
              return;
            }
          }
        }
      } catch {
        /* read error */
      } finally {
        consoleReadingRef.current = false;
        try {
          reader.releaseLock();
        } catch {
          /* ignore */
        }
      }
    })();
  }

  async function stopConsoleReader() {
    consoleReadingRef.current = false;
  }

  async function handleGetAddress() {
    setErrorMsg("");
    setAddressState("probing");
    setDeviceIp(null);
    addressRef.current = null;

    try {
      // Fresh connect — device is running normal firmware (post-flash or already running)
      const loader = await connect({
        log: () => {},
        error: () => {},
        debug: () => {},
      });
      loader.setConsoleMode(true);
      loaderRef.current = loader;

      // Attach console reader
      await new Promise<void>((resolve) => {
        startConsoleReader((ip) => {
          addressRef.current = ip;
          setDeviceIp(ip);
          setAddressState("found");
        });
        setTimeout(resolve, 100);
      });

      // Probe wifi --status
      for (let attempt = 0; attempt < WIFI_PROBE_ATTEMPTS; attempt++) {
        if (addressRef.current) {
          break;
        }
        try {
          const writer = loader.port.writable?.getWriter();
          if (writer) {
            await writer.write(new TextEncoder().encode(WIFI_STATUS_CMD));
            writer.releaseLock();
          }
        } catch {
          /* write failed */
        }
        await new Promise((r) => setTimeout(r, WIFI_PROBE_TIMEOUT_MS));
        if (addressRef.current) {
          break;
        }
      }

      if (!addressRef.current) {
        setAddressState("not_found");
      }
      await stopConsoleReader();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setAddressState("error");
    }
  }

  const addressBusy = addressState === "probing";
  const configUrl = deviceIp ? `http://${deviceIp}/#llm` : null;

  return (
    <Card className="h-full rounded-3xl border-border/50 bg-card/30 p-5 backdrop-blur md:p-7">
      <div className="space-y-5">
        {/* Step 1 · Get device address */}
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[oklch(0.78_0.12_75)] font-[Manrope] text-xs font-semibold text-[oklch(0.16_0.03_262)]">
            1
          </span>
          <div>
            <p className="font-[Manrope] text-sm font-semibold tracking-[-0.02em] text-foreground">
              {t("sections.flash.step2")}
            </p>
            <p className="text-xs leading-5 text-foreground/55">{t("sections.flash.step2Desc")}</p>
          </div>
        </div>

        <div className="space-y-3 pl-9">
          {!deviceIp ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleGetAddress()}
              disabled={addressBusy || !webSerialSupported}
              className="border-border/60 text-foreground/80 hover:bg-background/30"
            >
              {addressBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              {addressBusy ? t("sections.flash.gettingAddress") : t("sections.flash.getDeviceAddress")}
            </Button>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-background/15 p-4">
              <p className="text-xs tracking-[0.2em] text-foreground/50">{t("sections.flash.deviceAddressFound")}</p>
              <p className="mt-1 font-[Manrope] text-sm font-semibold tracking-[-0.02em] text-foreground">
                {configUrl}
              </p>
              <p className="mt-2 text-xs leading-5 text-foreground/55">{t("sections.flash.addressHint")}</p>
            </div>
          )}

          {addressState === "not_found" && (
            <p className="text-xs leading-5 text-foreground/55">{t("sections.flash.addressNotFound")}</p>
          )}
          {addressState === "error" && errorMsg && <p className="text-xs leading-5 text-destructive">{errorMsg}</p>}
        </div>

        {/* Step 2 · Open config page */}
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[oklch(0.78_0.12_75)] font-[Manrope] text-xs font-semibold text-[oklch(0.16_0.03_262)]">
            2
          </span>
          <div>
            <p className="font-[Manrope] text-sm font-semibold tracking-[-0.02em] text-foreground">
              {t("sections.flash.step3")}
            </p>
            <p className="text-xs leading-5 text-foreground/55">{t("sections.flash.step3Desc")}</p>
          </div>
        </div>

        {deviceIp && configUrl && (
          <div className="pl-9">
            <a
              href={configUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.78_0.12_75)] px-4 py-2 text-xs font-medium text-[oklch(0.16_0.03_262)] transition-colors hover:bg-[oklch(0.82_0.12_75)]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("sections.flash.openConfig")}
            </a>
          </div>
        )}

        {/* Step 3 · Import SoulPod */}
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[oklch(0.78_0.12_75)] font-[Manrope] text-xs font-semibold text-[oklch(0.16_0.03_262)]">
            3
          </span>
          <div>
            <p className="font-[Manrope] text-sm font-semibold tracking-[-0.02em] text-foreground">
              {t("sections.flash.step4")}
            </p>
            <p className="text-xs leading-5 text-foreground/55">{t("sections.flash.step4Desc")}</p>
          </div>
        </div>

        <div className="pl-9">
          <p className="text-xs tracking-[0.2em] text-foreground/55">{t("sections.flash.soulpodImportTitle")}</p>
          <ol className="mt-3 space-y-2">
            {[
              "soulpodImportStep1",
              "soulpodImportStep2",
              "soulpodImportStep3",
              "soulpodImportStep4",
            ].map((key) => (
              <li key={key} className="flex items-start gap-2 text-xs leading-5 text-foreground/65">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.78_0.12_75)]" />
                <span>{t(`sections.flash.${key}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );
}
