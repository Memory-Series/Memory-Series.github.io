/**
 * SoulPod deployment manifest.
 *
 * Each character's SoulPod is served from the Trace-Inhabit monorepo on GitHub
 * (raw.githubusercontent.com). The web page packs the character's files into a
 * downloadable zip that users can extract onto the device SD card under
 * `/sdcard/personas/<角色>/`.
 *
 * Only characters with a complete, tracked SoulPod package are downloadable.
 * Others render as "coming soon".
 */

const REPO_RAW =
  "https://raw.githubusercontent.com/Memory-Series/Trace-Inhabit/main";

export interface SoulPodFile {
  /** Path inside the zip, relative to `personas/<角色>/`. */
  zipPath: string;
  /** Remote raw URL. */
  url: string;
}

export interface SoulPodManifest {
  /** Character key matching the site's demo cards. */
  key: string;
  /** Chinese display name. */
  name: string;
  /** English display name. */
  enName: string;
  /** Whether a complete SoulPod package exists remotely. */
  available: boolean;
  /** File list (only set when available). */
  files: SoulPodFile[];
}

function raw(...parts: string[]): string {
  return [REPO_RAW, "inhabit", "personas", ...parts].map(encodeURIComponent).join("/");
}

export const SOULPOD_MANIFEST: SoulPodManifest[] = [
  {
    key: "xia-yizhou",
    name: "夏以昼",
    enName: "Caleb",
    available: true,
    files: [
      { zipPath: "profile.json", url: raw("夏以昼", "profile.json") },
      { zipPath: "config.json", url: raw("夏以昼", "config.json") },
      { zipPath: "system_prompts.txt", url: raw("夏以昼", "system_prompts.txt") },
      { zipPath: "memories/raw_memories.json", url: raw("夏以昼", "memories", "raw_memories.json") },
      { zipPath: "prompt/story_baseline.txt", url: raw("夏以昼", "prompt", "story_baseline.txt") },
      { zipPath: "prompt/universal_prompt.txt", url: raw("夏以昼", "prompt", "universal_prompt.txt") },
      { zipPath: "assets/source.txt", url: raw("夏以昼", "assets", "source.txt") },
      { zipPath: "assets/image/夏以昼头像.jpeg", url: raw("夏以昼", "assets", "image", "夏以昼头像.jpeg") },
    ],
  },
  {
    key: "ye-xiu",
    name: "叶修",
    enName: "Ye Xiu",
    available: true,
    files: [
      { zipPath: "profile.json", url: raw("叶修", "profile.json") },
      { zipPath: "config.json", url: raw("叶修", "config.json") },
      { zipPath: "system_prompts.txt", url: raw("叶修", "system_prompts.txt") },
      { zipPath: "memories/raw_memories.json", url: raw("叶修", "memories", "raw_memories.json") },
      { zipPath: "prompt/story_baseline.txt", url: raw("叶修", "prompt", "story_baseline.txt") },
      { zipPath: "prompt/universal_prompt.txt", url: raw("叶修", "prompt", "universal_prompt.txt") },
      { zipPath: "assets/source.txt", url: raw("叶修", "assets", "source.txt") },
      { zipPath: "assets/image/叶修.jpg", url: raw("叶修", "assets", "image", "叶修.jpg") },
    ],
  },
  {
    key: "zhuang-fangyi",
    name: "庄方宜",
    enName: "Zhuang Fangyi",
    available: false,
    files: [],
  },
  {
    key: "tuoba-yuer",
    name: "拓跋玉儿",
    enName: "Tuoba Yuer",
    available: false,
    files: [],
  },
  {
    key: "diana",
    name: "戴安娜",
    enName: "Diana",
    available: false,
    files: [],
  },
  {
    key: "qin-che",
    name: "秦彻",
    enName: "Sylus",
    available: true,
    files: [
      { zipPath: "profile.json", url: raw("秦彻", "profile.json") },
      { zipPath: "config.json", url: raw("秦彻", "config.json") },
      { zipPath: "system_prompts.txt", url: raw("秦彻", "system_prompts.txt") },
      { zipPath: "memories/raw_memories.json", url: raw("秦彻", "memories", "raw_memories.json") },
      { zipPath: "prompt/story_baseline.txt", url: raw("秦彻", "prompt", "story_baseline.txt") },
      { zipPath: "prompt/universal_prompt.txt", url: raw("秦彻", "prompt", "universal_prompt.txt") },
      { zipPath: "assets/source.txt", url: raw("秦彻", "assets", "source.txt") },
    ],
  },
];

/** Build a downloadable zip for a SoulPod package. */
export async function buildSoulPodZip(manifest: SoulPodManifest): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const file of manifest.files) {
    const resp = await fetch(file.url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch ${file.zipPath} (${resp.status})`);
    }
    zip.file(file.zipPath, await resp.arrayBuffer());
  }

  return zip.generateAsync({ type: "blob" });
}

/** Download helper. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
