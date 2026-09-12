import type { ReactNode } from "react";

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs tracking-[0.34em] text-foreground/60">{children}</p>;
}
