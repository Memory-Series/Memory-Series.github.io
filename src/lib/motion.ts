/** Shared motion tokens for section entrance animations. */
export const ease = [0.16, 1, 0.3, 1] as const;

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.75, ease },
  viewport: { once: true, margin: "-60px" },
} as const;

export function scrollToAnchor(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
