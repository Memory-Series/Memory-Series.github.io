/**
 * chat-003 —— 语音播放的**模块级单例**（懒 chunk 内，不进主包）。
 *
 * 为什么做成模块级而不是 React state：
 *   - **同一时刻只允许一条语音在播**。这个约束天然是"全局一个"的，放进每个按钮的
 *     state 里就得靠兄弟组件互相通知，反而更绕。模块级单例是它的直接表达。
 *   - **合成结果要按 `message.id` 跨消息缓存**：同一句重复播放**不重复请求**，
 *     也就**不重复计费**。缓存属于"这次会话"，不属于某个组件实例。
 *
 * 三条纪律（与 `chat-002` 一致）：
 *   1. **不落任何存储** —— 不写 localStorage / sessionStorage / IndexedDB；
 *      音频只以 `objectURL` 存在内存里，抽屉卸载时 `revokeObjectURL`。
 *   2. **缓存的是合成好的音频，不是"已播放"这件事** —— 换个说法：缓存命中时不打请求，
 *      但**照样重新播放**（再点一次就是再听一遍，符合直觉）。
 *   3. **失败不报红色错误** —— 统一转成"不可用 + 一行灰字"，与素材库面板的既有约定一致。
 */

import {
  TTS_CLIENT_LIMITS,
  TTS_ENDPOINT,
  buildTtsRequest,
  interpretTtsResponse,
  type TtsFailReason,
} from "@/lib/chat-tts";
import type { ChatCharKey } from "@/lib/chat-keys";

export type SpeakStatus =
  | { state: "loading" }
  | { state: "playing" }
  | { state: "paused" }
  | { state: "failed"; reason: TtsFailReason };

/** `message.id` → 已合成的 `objectURL`。 */
const urlCache = new Map<string, string>();

/** 当前挂在 `<audio>` 上的元素。`null` 表示没有正在播/暂停的音频。 */
let audioEl: HTMLAudioElement | null = null;
/** 当前占着播放位的消息 id。 */
let playingId: string | null = null;
/** 当前那条消息的"复位"回调 —— 用来把它的 UI 状态清回 idle。 */
let resetActive: (() => void) | null = null;

function teardownAudio(): void {
  if (!audioEl) return;
  audioEl.onended = null;
  audioEl.pause();
  audioEl.src = "";
  audioEl = null;
  playingId = null;
}

function takeReset(): (() => void) | null {
  const fn = resetActive;
  resetActive = null;
  return fn;
}

/**
 * 停掉当前正在播的那条，并让它的按钮复位。
 * 切换播放、关闭抽屉时都走它。
 */
export function stopSpeech(): void {
  const reset = takeReset();
  teardownAudio();
  reset?.();
}

/**
 * 某条消息的组件卸载了：如果它正在播就停下。
 *
 * **不回调它自己的 `onStatus`** —— 组件已经不在树上了，触发 `setState` 没有意义。
 * 这条路径与 `stopSpeech` 分开，是为了让"卸载"不产生一次无主的 setState。
 */
export function releaseSpeech(id: string): void {
  if (playingId !== id) return;
  resetActive = null;
  teardownAudio();
}

/** 抽屉卸载：停播 + 撤销全部 `objectURL`（否则 blob 会一直占着内存）。 */
export function disposeSpeech(): void {
  resetActive = null;
  teardownAudio();
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}

/**
 * 取音频。成功返回一个 `objectURL`。
 *
 * 用 `blob()` 而不是 `arrayBuffer()`：`<audio>` 与 `URL.createObjectURL` 都吃 Blob，
 * 中间不必再自己管一段原始字节。
 */
async function fetchSpeechUrl(
  charKey: ChatCharKey,
  text: string,
): Promise<{ ok: true; url: string } | { ok: false; reason: TtsFailReason }> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TTS_CLIENT_LIMITS.timeoutMs);
  try {
    const res = await fetch(TTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildTtsRequest(charKey, text)),
      signal: controller.signal,
    });
    const verdict = interpretTtsResponse({
      status: res.status,
      contentType: res.headers.get("content-type"),
    });
    if (!verdict.ok) return { ok: false, reason: verdict.reason };

    const blob = await res.blob();
    // 空 blob 也算失败：宁可显示"暂不可用"，也不要让用户点下去什么都没有。
    if (blob.size === 0) return { ok: false, reason: "error" };
    return { ok: true, url: URL.createObjectURL(blob) };
  } catch {
    // 网络失败 / 超时 / 被 abort：一律当"不可用"。用户看不到任何红色错误。
    return { ok: false, reason: "error" };
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * 点一下播放按钮要做的全部事情。
 *
 * 状态机（见 `spec-chat-tts.md` §7.2）：
 * ```
 * idle ──click──▶ loading ──200──▶ playing ──end──▶ idle（可再播）
 *                     │
 *                     └──非 2xx──▶ failed（灰字说明，仍可点重试）
 * ```
 *
 * @param {{ id: string, charKey: ChatCharKey, text: string, onStatus: (s: SpeakStatus | null) => void }} opts
 */
export async function toggleSpeech(opts: {
  id: string;
  charKey: ChatCharKey;
  text: string;
  onStatus: (status: SpeakStatus | null) => void;
}): Promise<void> {
  const { id, charKey, text, onStatus } = opts;

  // 1) 正在播的就是这一条 → 暂停 / 继续。**不重新请求**（也就不重复计费）。
  if (audioEl && playingId === id) {
    if (audioEl.paused) {
      try {
        await audioEl.play();
        onStatus({ state: "playing" });
      } catch {
        stopSpeech();
        onStatus({ state: "failed", reason: "error" });
      }
    } else {
      audioEl.pause();
      onStatus({ state: "paused" });
    }
    return;
  }

  // 2) 切到另一条：**先停上一条**（同一时刻只有一条语音在播）。
  stopSpeech();
  const mine = () => onStatus(null);
  resetActive = mine;

  // 3) 有缓存就直接播，不打请求。
  let url = urlCache.get(id);
  if (!url) {
    onStatus({ state: "loading" });
    const fetched = await fetchSpeechUrl(charKey, text);

    // 等待期间可能已被切走 / 被停止 / 组件已卸载。用一个身份比较来判断"还是不是我的"：
    // 比 `id` 更可靠（同一条消息可能已经被重新点过一次）。
    if (resetActive !== mine) {
      if (fetched.ok) URL.revokeObjectURL(fetched.url); // 别让刚拿到的 blob 泄漏
      return;
    }
    if (!fetched.ok) {
      resetActive = null;
      onStatus({ state: "failed", reason: fetched.reason });
      return;
    }
    url = fetched.url;
    urlCache.set(id, url);
  }

  // 4) 播放。
  const el = new Audio(url);
  audioEl = el;
  playingId = id;
  el.onended = () => {
    const reset = takeReset();
    teardownAudio();
    reset?.();
  };
  try {
    await el.play();
    onStatus({ state: "playing" });
  } catch {
    const reset = takeReset();
    teardownAudio();
    reset?.();
    onStatus({ state: "failed", reason: "error" });
  }
}
