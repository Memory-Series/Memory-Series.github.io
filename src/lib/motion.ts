/** Shared motion tokens for section entrance animations. */
export const ease = [0.16, 1, 0.3, 1] as const;

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.75, ease },
  viewport: { once: true, margin: "-60px" },
} as const;

/**
 * Scroll to a section anchor.
 *
 * a11y-001: honours the OS "reduce motion" preference — when the user has asked
 * for less motion, jump straight to the target instead of smooth-scrolling.
 * (The global `scroll-behavior` is handled in index.css; this covers the JS path.)
 */
export function scrollToAnchor(sectionId: string) {
  const target = document.getElementById(sectionId);
  if (!target) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}
