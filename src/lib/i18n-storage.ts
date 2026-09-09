/**
 * localStorage-backed persistence for the i18n language preference.
 *
 * Why a dedicated helper instead of inline `localStorage` calls?
 * - Centralizes the storage key so it's easy to rename / grep.
 * - Hides the SSR-safety try/catch (localStorage may be undefined in Node).
 * - Keeps the persistence side-effect out of src/i18n.ts, which is a
 *   side-effect-heavy init module that is harder to unit test.
 *
 * i18n-002: persisted language preference, kept across reloads.
 */

export const I18N_STORAGE_KEY = "ms.i18n.lng";

const SUPPORTED = ["zh", "en"] as const;
export type SupportedLng = (typeof SUPPORTED)[number];

function isSupported(lng: string | null | undefined): lng is SupportedLng {
  return !!lng && (SUPPORTED as readonly string[]).includes(lng);
}

/** Resolve the initial language using localStorage -> navigator.language -> default. */
export function resolveInitialLng(defaultLng: SupportedLng = "zh"): SupportedLng {
  if (typeof window === "undefined") return defaultLng;
  try {
    const stored = window.localStorage.getItem(I18N_STORAGE_KEY);
    if (isSupported(stored)) return stored;
  } catch {
    // localStorage may throw (privacy mode, quota, disabled cookies). Fall through.
  }
  const nav = window.navigator?.language?.toLowerCase() ?? "";
  if (nav.startsWith("zh")) return "zh";
  return "en";
}

/** Persist the user's language choice. Silent on failure (privacy mode etc). */
export function persistLng(lng: SupportedLng): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(I18N_STORAGE_KEY, lng);
  } catch {
    // Ignore — preference simply won't persist for this user.
  }
}