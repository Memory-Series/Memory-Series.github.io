import { useTranslation } from "react-i18next";

const FOOTER_LINK_KEYS = ["footer.links.privacy", "footer.links.terms", "footer.links.contact"] as const;

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold">
              <span className="font-[Manrope]">Memory</span> Series
            </div>
            <p className="mt-2 text-sm leading-7 text-foreground/60">Memory Series · Trace / Inhabit</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/55">
            {FOOTER_LINK_KEYS.map((item) => (
              <span key={item} className="underline-offset-4 hover:text-foreground/70">
                {t(item)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
