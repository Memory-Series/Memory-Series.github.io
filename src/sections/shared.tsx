import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs tracking-[0.34em] text-foreground/60">{children}</p>;
}

/**
 * A device SD-card path with a copy button.
 *
 * Lives here rather than inside one section because more than one converter
 * needs it, and having a section component import from a sibling section
 * creates a circular dependency.
 */
export function PathLine({ path }: { path: string }) {
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
