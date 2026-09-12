/**
 * Device asset library manifest.
 *
 * Static files shipped with the site under `public/assets/`, offered for direct
 * download so users can drop them onto the device SD card themselves. Nothing
 * here is read from the device — the page only publishes files plus the exact
 * destination path for each one.
 *
 * Two categories in phase 1:
 *   1. Boot animation   → `.eaf`, `/sdcard/system/boot/boot.eaf`
 *   2. Dialogue bubble  → `dialogue_bg.bin`, `/sdcard/personas/<角色>/assets/ui/dialogue_bg.bin`
 *
 * Character `key`s intentionally mirror SOULPOD_MANIFEST so the two features
 * stay addressable by the same identifier.
 */

/** Destination paths on the device SD card. */
export const DEVICE_PATHS = {
  /** Boot animation target — a single well-known file. */
  boot: "/sdcard/system/boot/boot.eaf",
  /** Dialogue bubble background, per character. */
  dialogueBg: (characterKey: string) =>
    `/sdcard/personas/${characterKey}/assets/ui/dialogue_bg.bin`,
} as const;

/**
 * Phase-1 guidance limits, surfaced in the UI so users can sanity-check a file
 * before copying it onto the card.
 */
export const BOOT_EAF_SIZE_LIMIT = 3 * 1024 * 1024; // 3 MB
export const BOOT_EAF_FPS = 24;
export const DIALOGUE_BG_WIDTH = 412;
export const DIALOGUE_BG_HEIGHT = 412;
/** Fixed on-disk size of a 412×412 RGB565A8 buffer plus its 12-byte header. */
export const DIALOGUE_BG_BYTES = 509244;

export interface DeviceAssetFile {
  /** File name as it should appear on the SD card. */
  fileName: string;
  /** Path inside `public/assets/`, relative — joined with `import.meta.env.BASE_URL`. */
  publicPath: string;
  /** Byte size on disk, for the UI to display. */
  bytes: number;
}

export interface DeviceAssetEntry {
  /** Stable id, used for React keys and i18n lookups. */
  id: string;
  /** Preview image (png) served from `public/assets/`, or null when none exists. */
  previewPath: string | null;
  /** Downloadable originals. Empty for preview-only entries. */
  files: DeviceAssetFile[];
  /** Destination path shown to the user. */
  targetPath: string;
  /** i18n key suffix under `sections.assets.boot.*`. */
  labelKey: string;
  /** Optional i18n key for a short note rendered under the entry. */
  noteKey?: string;
  /** Native pixel size of the source render, shown as a small spec chip. */
  sourceSize: string;
}

export interface DialogueCharacterAssets {
  /** Matches SOULPOD_MANIFEST[].key and DemoSection character keys. */
  key: string;
  /** Chinese display name. */
  name: string;
  /** English display name. */
  enName: string;
  /** The character's dialogue background. */
  entry: DialogueAssetEntry;
}

export interface DialogueAssetEntry extends DeviceAssetEntry {
  /** i18n key suffix under `sections.assets.dialogue.*`. */
  labelKey: string;
}

/* ------------------------------------------------------------------ */
/* Boot animations                                                     */
/* ------------------------------------------------------------------ */

/**
 * Boot animation — one build only.
 *
 * This is the production default: a starfield resolving into the
 * "恋与深空 / LOVE AND DEEPSPACE" wordmark, rendered at 280×280, 3.05 MB.
 *
 * A 1200×1200 high-resolution master also exists in the source material, but it
 * is ~6.2 MB — well over the recommended ceiling — and shipping it alongside the
 * default only invites confusion about which one belongs on the device. It is
 * deliberately not offered here.
 *
 * Note: the original GIF exports read as completely black (a Lottie export
 * artifact). The preview below was generated from raw RGB565A8 frames instead
 * (`docs/start/boot_bin/frame_051.bin`), landing on the frame where the wordmark
 * is fully formed.
 */
export const BOOT_ASSETS: DeviceAssetEntry[] = [
  {
    id: "boot-default",
    labelKey: "bootDefault",
    previewPath: "assets/boot/boot-preview-default.png",
    sourceSize: "280 × 280",
    files: [
      {
        fileName: "boot.eaf",
        publicPath: "assets/boot/boot-default.eaf",
        bytes: 3054945,
      },
    ],
    targetPath: DEVICE_PATHS.boot,
    noteKey: "bootDefaultNote",
  },
];

/* ------------------------------------------------------------------ */
/* Dialogue bubble backgrounds                                         */
/* ------------------------------------------------------------------ */

function dialogueEntry(characterKey: string): DialogueAssetEntry {
  return {
    id: `dialogue-${characterKey}`,
    labelKey: "dialogueBg",
    previewPath: `assets/dialogue/${characterKey}/preview.png`,
    sourceSize: "412 × 412",
    files: [
      {
        fileName: "dialogue_bg.bin",
        publicPath: `assets/dialogue/${characterKey}/dialogue_bg.bin`,
        bytes: DIALOGUE_BG_BYTES,
      },
    ],
    targetPath: DEVICE_PATHS.dialogueBg(characterKey),
  };
}

/**
 * Only characters that actually have a dialogue background are listed.
 *
 * The catalogue has six characters, but only these two have had a bubble asset
 * produced. Placeholders for the other four were removed by request — an
 * empty-looking card reads as a broken download rather than "not ready yet".
 * Add an entry here once a character's asset exists.
 */
export const DIALOGUE_CHARACTERS: DialogueCharacterAssets[] = [
  { key: "xia-yizhou", name: "夏以昼", enName: "Caleb", entry: dialogueEntry("xia-yizhou") },
  { key: "qin-che", name: "秦彻", enName: "Sylus", entry: dialogueEntry("qin-che") },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Resolve a `public/`-relative path into a runtime URL (vite base-aware). */
export function assetUrl(publicPath: string): string {
  return `${import.meta.env.BASE_URL}${publicPath}`;
}

/** Format a byte count into a short, locale-neutral size label. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
