/**
 * SoulPod deployment manifest.
 *
 * 每个角色的 SoulPod 源文件在 Trace-Inhabit monorepo 里；网页把它们打包成一个 zip，
 * 用户解压到设备 SD 卡的 `/sdcard/personas/<角色>/`。
 *
 * 只有带完整 SoulPod 包的角色可下载，其余渲染成「即将上线」。
 *
 * ---
 * ## 素材源：为什么是「多源兜底」而不是单一来源
 *
 * 原实现只走 `raw.githubusercontent.com`。该域名在**国内可达性极不稳定** ——
 * 2026-09-27 在浏览器里实测（4 轮 × 3 文件 / 源，脚本与原始输出见 harness 记录）：
 *
 * | 源 | 成功率 | 平均 | 最慢 |
 * | --- | --- | --- | --- |
 * | `cdn.jsdelivr.net` | 12/12 | **353 ms** | 2 005 ms |
 * | `gh-proxy.com` | 12/12 | **389 ms** | 2 660 ms |
 * | `raw.githubusercontent.com` | 12/12 | 1 914 ms | **21 339 ms** |
 *
 * raw **不是不通，而是长尾极差**：真实点「下载 SoulPod」4 次里有 **2 次整条请求
 * 直接 reject**（`TypeError: Failed to fetch`，不是超时），成功那两次一次 19.2 s、一次 2.0 s。
 * zip 是逐个文件顺序拉的，**任意一份取不到整个下载就失败**，所以长尾在这里是致命的。
 *
 * 因此：**每个文件按 `SOULPOD_SOURCES` 顺序依次尝试，第一个 200 的胜出。**
 * 这不是「美化」，是让按钮在真实网络下点得动。
 */

const REPO_SLUG = "Memory-Series/Trace-Inhabit";
const REPO_BRANCH = "main";
const PERSONA_DIR = "inhabit/personas";

/**
 * 素材源构造器，**顺序即优先级**（按上表的实测数据排）。
 * 入参是已经逐段编码好的、`personas/` 之后的相对路径。
 */
const SOULPOD_SOURCES: readonly ((relPath: string) => string)[] = [
  // 1. jsDelivr 的 GitHub 通道：国内平均最快、长尾最好
  (p) => `https://cdn.jsdelivr.net/gh/${REPO_SLUG}@${REPO_BRANCH}/${PERSONA_DIR}/${p}`,
  // 2. 官方 raw：第二顺位（可达但不稳）
  (p) => `https://raw.githubusercontent.com/${REPO_SLUG}/${REPO_BRANCH}/${PERSONA_DIR}/${p}`,
  // 3. gh-proxy：第三方反代，实测与 jsDelivr 同级；前两个都挂时兜住
  (p) => `https://gh-proxy.com/https://raw.githubusercontent.com/${REPO_SLUG}/${REPO_BRANCH}/${PERSONA_DIR}/${p}`,
];

export interface SoulPodFile {
  /** Path inside the zip, relative to `personas/<角色>/`. */
  zipPath: string;
  /** 主源地址（= `SOULPOD_SOURCES[0]`）；其余源在打包时按需派生。 */
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

/**
 * 拼某个角色某个文件的**全部候选地址**，按优先级排列。
 *
 * **只编码路径段，绝不编码域名前缀**：前缀含 scheme，若一并走 `encodeURIComponent`，
 * 整串会变成 `https%3A%2F%2F…` —— 不再以 scheme 开头，`fetch()` 会把它当**相对路径**
 * 解析到本站域（`https://<站点>/https%3A%2F%2F…`），每个文件都拿到 404。
 * 本文件曾写成 `[REPO_RAW, …].map(encodeURIComponent).join("/")`，于是「下载 SoulPod」
 * 自上线起从未成功过（三个角色的源文件其实一直都在，纯粹是拼装错）。
 * 回归网见 `tests/soulpod-url.test.ts`。
 */
export function soulPodUrls(characterName: string, ...parts: string[]): string[] {
  const relPath = [characterName, ...parts].map(encodeURIComponent).join("/");
  return SOULPOD_SOURCES.map((build) => build(relPath));
}

/** 主源地址（manifest 里存的就是这个）。 */
function raw(name: string, ...parts: string[]): string {
  return soulPodUrls(name, ...parts)[0];
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

/**
 * 逐个候选源取一份文件，返回第一个成功的响应体。
 *
 * 为什么值得写这段：zip 是**串行**拉的，任一文件失败整个下载就报错。
 * 单源时「raw 抽风」= 用户点了没反应；三源时需要三个源同时挂掉才会失败。
 * 三个都失败时抛出的消息里带 **host + 结局**（HTTP 码 / 网络失败），
 * 但不含上游正文 —— 沿用站点既有约定：不把内部细节暴露给用户，同时让反馈可定位。
 */
async function fetchFromAnySource(characterName: string, file: SoulPodFile): Promise<ArrayBuffer> {
  const candidates = soulPodUrls(characterName, ...file.zipPath.split("/"));
  const tried: string[] = [];
  for (const url of candidates) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return await resp.arrayBuffer();
      tried.push(`${new URL(url).host}: HTTP ${resp.status}`);
    } catch {
      tried.push(`${new URL(url).host}: 网络失败`);
    }
  }
  throw new Error(`SoulPod 素材源均不可用（${file.zipPath}）：${tried.join("、")}`);
}

/** Build a downloadable zip for a SoulPod package. */
export async function buildSoulPodZip(manifest: SoulPodManifest): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const file of manifest.files) {
    zip.file(file.zipPath, await fetchFromAnySource(manifest.name, file));
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
