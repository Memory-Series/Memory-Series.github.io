/**
 * chat-003 —— 「聊聊」回复语音的**纯逻辑层**。
 *
 * 与 `chat-core.ts` 同一条纪律：本文件**不碰 DOM、不发请求、不读 i18n** ——
 * 这样它才是 `backend-001`（vitest）能测的目标，而且它随对话抽屉那个懒 chunk 走，
 * 越干净 chunk 越小。真正的播放与缓存放在 `chat-tts-audio.ts`。
 *
 * 权威在服务端（见 `harness/docs/spec-chat-tts.md`）：这里的长度裁剪只是"省流量"，
 * **服务端会再裁一遍**，且音色、模型、合成参数一律由服务端决定 ——
 * 客户端连 `voice_id` 都不传。
 */

import { trimToChars } from "@/lib/chat-core";
import type { ChatCharKey } from "@/lib/chat-keys";

/** 语音合成接口。与 `chat-002` 的 `/api/chat` 并列，不是它的参数分支。 */
export const TTS_ENDPOINT = "/api/tts";

export const TTS_CLIENT_LIMITS = {
  /** 与对话同口径：助手回复本身就被限制在 200 字以内，取同一个数不会把正常回复截掉。 */
  maxChars: 200,
  /**
   * 比对话的 20 s 更长 —— 合成音频比生成文本慢（服务端那侧是 `TTS_UPSTREAM_TIMEOUT_MS=30 s`，
   * 这里与之对齐；前端先超时只会让用户看到"合成失败"，而服务端其实还在算）。
   */
  timeoutMs: 30_000,
} as const;

/**
 * 一条助手消息的来源。
 *
 * 为什么要有这个字段，而不是直接用 `degraded === null`：**开场白**。
 * 开场白由站点自带（`chat-personas.ts`），它在京东云是真回复的待遇（不显示降级说明），
 * 所以 `degraded` 是 `null`。但它是**打包进站点的固定文案**：
 *   ① 让它朗读等于让站点花钱念自己的固定台词；
 *   ② 在 GitHub Pages 上它同样存在，于是一个 `degraded === null` 的判据会让
 *      GH 站的**第一条消息就长出一个永远点不通的播放按钮** —— 而「GH 侧看不到播放按钮」
 *      是这条特性的既定承诺。
 * 所以判据落在一个**显式**的来源字段上：只有 `model` 才谈得上"有对应音频"。
 *
 * 失败方向也是对的：忘了标 `model` 只是少一个按钮，不会多一个点不通的按钮。
 */
export type SpeakMessageSource = "model" | "script";

/**
 * 哪些角色**已经有音色**（后端 `server/lib/tts.mjs` 的 `TTS_VOICES` 里有条目）。
 *
 * 为什么前端必须知道这件事：显示判据要在**点击之前**成立。否则一期没做音色的角色
 * （叶修 / 秦彻）也会拿到一个"点了才告诉你这里没有音色"的按钮 —— 正是下面那条
 * 失败方向原则要避免的形态。2026-09-29 线上验收时实测到过这个缺口。
 *
 * 三种做法里选了这个：
 *   ① 前端存一份键集（本常量）→ 零额外请求；与后端的一致性由
 *      `tests/chat-tts.test.ts` **直接读 `server/lib/tts.mjs` 断言**，漂移即测试失败；
 *   ② 加一个 `/api/voices` 探测接口 → 为了让一个可选按钮多一次网络请求，不划算；
 *   ③ 按 hostname 猜 / 等第一次点按失败 → 硬编码环境假设，且必然先给出一个点不通的按钮。
 *
 * **新增音色时两处一起加**：这里 + `server/lib/tts.mjs` 的 `TTS_VOICES`。
 */
export const TTS_SPEAKABLE_CHAR_KEYS: ReadonlySet<ChatCharKey> = new Set<ChatCharKey>(["xia-yizhou"]);

/** 语音按钮的显示判据所需的最小信息。 */
export interface SpeakableMessage {
  role: "user" | "assistant";
  source?: SpeakMessageSource;
}

/**
 * 这条消息该不该显示播放按钮。
 *
 * 两个条件缺一不可：**走过一次真实上游调用且没降级**（`source === "model"`），
 * **且这个角色已经有音色**（`TTS_SPEAKABLE_CHAR_KEYS`）。
 *
 * | 场景 | source | 角色有音色 | 按钮 |
 * | --- | --- | --- | --- |
 * | 京东云 + 真模型回复 + 夏以昼 | `model` | 是 | **显示** |
 * | 京东云 + 真模型回复 + 叶修/秦彻（一期无音色） | `model` | 否 | 不显示 |
 * | 京东云 + 触发限额/上游失败 → 台词库 | `script` | — | 不显示（本来也没有对应音频） |
 * | GitHub Pages（无后端 → 全部台词库） | `script` | — | 不显示 |
 * | 开场白（站点自带） | `script` | — | 不显示 |
 *
 * 为什么不用「按 hostname 判定」或「启动时 ping `/api/health`」：前者是硬编码的
 * 环境假设（本地开发、换域名、临时预览全都要改），后者要往抽屉里塞一次额外的、
 * 可能失败的网络探测。`source` 是**已经发生过的事实**，音色有无是**部署时已知的事实**，
 * 两个判据都是免费的。
 */
export function shouldShowSpeakButton(message: SpeakableMessage, charKey: ChatCharKey): boolean {
  return (
    message.role === "assistant" &&
    message.source === "model" &&
    TTS_SPEAKABLE_CHAR_KEYS.has(charKey)
  );
}

/**
 * 构造请求体。**只有 `charKey` + `text`** —— 与 `chat-002` 的「客户端永不传 system」
 * 是同一条约束：`voice_id` 一旦可由客户端指定，这个接口就能被用来合成任意音色的语音。
 */
export function buildTtsRequest(
  charKey: ChatCharKey,
  text: string,
  maxChars: number = TTS_CLIENT_LIMITS.maxChars,
): { charKey: ChatCharKey; text: string } {
  return { charKey, text: trimToChars(text, maxChars) };
}

/** 语音不可用的原因 —— 决定界面显示哪一句灰字，**不决定行为**（四种走同一条路径）。 */
export type TtsFailReason = "quota" | "disabled" | "unavailable" | "error";

export type TtsVerdict = { ok: true } | { ok: false; reason: TtsFailReason };

/**
 * 判定一次 `/api/tts` 响应能不能用。
 *
 * **为什么要单独判 `content-type`**：静态站点（vite dev / nginx `try_files`）在路径没匹配上时
 * 常常返回 `index.html` + **HTTP 200**。只看状态码会把一整页 HTML 交给 `<audio>` ——
 * 表现是"点了播放没反应"，而且不会有任何报错。本项目在素材校验上踩过同一个坑。
 *
 * 注意这里**不读 body**：成功时 body 是 mp3 二进制，交给 `blob()` 更合适。
 */
export function interpretTtsResponse(input: { status: number; contentType: string | null }): TtsVerdict {
  const { status, contentType } = input;

  if (status === 429) return { ok: false, reason: "quota" };
  if (status === 503) return { ok: false, reason: "disabled" };
  if (status === 403 || status === 404 || status === 405 || status === 413) {
    return { ok: false, reason: "unavailable" };
  }
  if (status < 200 || status >= 300) return { ok: false, reason: "error" };

  const ct = (contentType ?? "").toLowerCase();
  if (!ct.includes("audio/")) return { ok: false, reason: "unavailable" };

  return { ok: true };
}
