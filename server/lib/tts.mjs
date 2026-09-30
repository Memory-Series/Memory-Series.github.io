// @ts-check
/**
 * chat-003 —— 语音合成（MiniMax T2A）的上游调用与请求体校验。
 *
 * 与 `upstream.mjs`（对话）刻意**分开一个文件**，因为两者的契约毫无重叠：
 * 一个读 JSON 回文本、一个读 hex 回二进制；一个按 token 计费、一个按字符计费；
 * 超时、限额、日志字段全都不同。合并只会让两边都变得难读。
 *
 * 三条不能省的规矩（与对话侧同源）：
 *   1. **音色、模型、合成参数一律由服务端决定**，客户端只能给 `charKey` + `text`。
 *   2. **上游原始错误绝不转发**。`status_msg` 里偶尔会带回请求片段。
 *   3. **超时自己控**，且比对话更长（合成音频比生成文本慢）。
 *
 * 只读参照：esp-claw 的 `board_tts_minimax.c` 与角色 `config.json`（**只借鉴参数口径，
 * 不复制代码、不改它一个字节**）。
 */
import { trimToChars } from "./limits.mjs";

/**
 * 请求体顶层**只允许**这两个键。
 *
 * ⚠️ `text` 是"任意文本"这件事必须正视：它意味着这个接口一旦被探测到，就可能被当成
 * **免费的 TTS 网关**（读任意文本），而 TTS 的滥用成本是**线性**的（每个字都计费）。
 * 缓解手段只有三条、缺一不可：① 这张白名单（挡夹带配置）；② 单次长度上限；
 * ③ 独立限额。**不引入"只能朗读服务端刚生成过的文本"** —— 那要求服务端留存对话正文，
 * 与 `chat-002` 的「不落任何存储」直接冲突。
 */
export const ALLOWED_TTS_TOP_LEVEL_KEYS = ["charKey", "text"];

/**
 * 音色表 —— **一期只有一条**。
 *
 * 取值来源：esp-claw 的 `sdcard_template/personas/夏以昼/config.json` 的 `tts` 块
 * （`tts_provider: "minimax"` / `voice_id: "XiaYizhou01"` / `emotion: "happy"` /
 * `speed: 1.0` / `vol: 8`）。
 *
 * 为什么把映射写在服务端而不是让前端传 `voice_id`：`voice_id` 一旦可由客户端指定，
 * 这个接口就能被用来合成**任意音色**的语音 —— 那是别人的资产，也把计费敞口放大。
 * 「服务端只认 charKey」与对话侧的「客户端永不传 system」是同一条约束。
 *
 * `Object.freeze` 是为了让"某个请求顺手改了音色表"这类事故不可能发生。
 */
export const TTS_VOICES = Object.freeze({
  "xia-yizhou": Object.freeze({
    voiceId: "XiaYizhou01",
    emotion: "happy",
    speed: 1.0,
    vol: 8,
    pitch: 0,
  }),
});

/**
 * 这个 charKey 有没有音色。
 *
 * 用 `Object.prototype.hasOwnProperty.call` 而不是 `key in TTS_VOICES`：
 * 后者对 `"toString"` / `"constructor"` 这类原型链上的键会返回 `true`，
 * 于是一个精心构造的 `charKey` 就能绕过音色检查、带着 `undefined` 的
 * `voice_id` 打到上游去。
 *
 * @param {string} charKey
 * @returns {boolean}
 */
export function hasTtsVoice(charKey) {
  return typeof charKey === "string" && Object.prototype.hasOwnProperty.call(TTS_VOICES, charKey);
}

/**
 * 音频参数。写 `sample_rate: 16000` 是**与 esp-claw 参照实现逐字对齐**的取值。
 *
 * ⚠️ 2026-09-28 实测：请求写 16000，**上游返回的是 32000 Hz** 的 mp3。
 * 因此服务端与前端都**不得假设采样率**，一律以响应字节为准（我们原样透传，
 * 浏览器自己会读 mp3 头）。这条不是可选项 —— 若前端按 16000 去算时长，数字会差一倍。
 */
export const TTS_AUDIO_SETTING = Object.freeze({
  sample_rate: 16000,
  bitrate: 128000,
  format: "mp3",
  channel: 1,
});

/**
 * @typedef {object} ParsedTtsBody
 * @property {string} charKey
 * @property {string} text   已归一化并截断到上限
 */

/**
 * 解析并校验 `/api/tts` 的请求体。
 *
 * 判据沿用 `chat-002` 已收口的那条：**能忽略的就忽略，不能忽略的才拒绝**。
 * 顶层多出来的 `voice_id` / `model` / `emotion` / `speed` / `vol` / `apiKey` 一律
 * **忽略且不报错** —— 400 等于告诉探测者白名单长什么样。只有两种情况才拒绝：
 *   - `no_voice`：`charKey` 没有对应音色 → 请求本身**没有可执行的语义**（没音色可合成）。
 *     注意 `charKey` 缺失或不是字符串也归到这里：它同样是"没有可执行的语义"，
 *     而不是"多带了字段"。
 *   - `bad_request`：`text` 缺失 / 非字符串 / 归一化后为空。
 *
 * `reason` 是**给日志看的**内部细节，响应体里只有笼统的 code。
 *
 * @param {unknown} raw
 * @param {{ maxChars: number }} opts
 * @param {(key: string) => boolean} hasVoice 由调用方注入，便于测试
 * @returns {{ ok: true, value: ParsedTtsBody } | { ok: false, code: "no_voice" | "bad_request", reason: string }}
 */
export function parseTtsBody(raw, opts, hasVoice) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, code: "bad_request", reason: "body 不是 JSON 对象" };
  }
  const body = /** @type {Record<string, unknown>} */ (raw);

  const charKey = body.charKey;
  if (!hasVoice(typeof charKey === "string" ? charKey : "")) {
    return { ok: false, code: "no_voice", reason: "charKey 无对应音色" };
  }

  const rawText = body.text;
  if (typeof rawText !== "string") {
    return { ok: false, code: "bad_request", reason: "text 不是字符串" };
  }
  // 与对话同口径：先归一化换行与空白、再截断。超长**截断不报错** ——
  // 助手回复本身就被限制在 200 字以内，正常请求碰不到这条。
  const text = trimToChars(rawText, opts.maxChars);
  if (text === "") {
    return { ok: false, code: "bad_request", reason: "text 归一化后为空" };
  }

  return { ok: true, value: { charKey: /** @type {string} */ (charKey), text } };
}

/**
 * 顶层是否出现了被保留的字段。**不用于拒绝**，只用于日志告警 ——
 * 与 `limits.reservedKeysPresent` 同一个理由：报错等于告诉探测者白名单里有什么。
 *
 * @param {unknown} raw
 * @returns {string[]}
 */
export function reservedTtsKeysPresent(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.keys(raw).filter((k) => !ALLOWED_TTS_TOP_LEVEL_KEYS.includes(k));
}

/**
 * 组装上游请求体。
 *
 * `output_format: "hex"` 是**刻意**的：esp-claw 优先用 `"url"`（让 MiniMax 托管音频、
 * 设备端只拿一个链接，省 MCU 内存与流量），网页端的取舍正好相反 ——
 * 不把第三方临时 URL 暴露给浏览器、前端不必处理跨源、几十 KB 的 hex 开销可忽略。
 * 详见 `harness/docs/spec-chat-tts.md` §5.3。
 *
 * @param {{ ttsModel: string }} config
 * @param {{ voiceId: string, emotion: string, speed: number, vol: number, pitch: number }} voice
 * @param {string} text
 * @returns {Record<string, unknown>}
 */
export function buildTtsPayload(config, voice, text) {
  return {
    model: config.ttsModel,
    text,
    stream: false,
    voice_setting: {
      voice_id: voice.voiceId,
      speed: voice.speed,
      vol: voice.vol,
      pitch: voice.pitch,
      emotion: voice.emotion,
    },
    audio_setting: { ...TTS_AUDIO_SETTING },
    language_boost: "Chinese",
    output_format: "hex",
  };
}

/**
 * 非负整数归一化。上游偶尔会回 `null` 或字符串，这里统一成 `0` 而不是 `NaN` ——
 * 它要进 state.json，落一个 `NaN` 会让那个文件变成非法 JSON。
 *
 * @param {unknown} value
 * @returns {number}
 */
function toNonNegativeInt(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * 从上游响应里取音频。
 *
 * **成功判据三者同时成立**：`base_resp.status_code === 0`、`data.audio` 是非空字符串。
 * 任一条不成立就返回 `null`（调用方转成 `upstream_shape` → 502）——
 * 尤其是「HTTP 200 但 `status_code != 0`」这一支：**绝不能把半成品音频回给前端**，
 * 那会让用户听到一段截断的声音，还照样按字符付了钱。
 *
 * @param {unknown} json
 * @returns {{ audioHex: string, usageCharacters: number, audioLength: number } | null}
 */
export function extractTtsAudio(json) {
  if (json === null || typeof json !== "object") return null;
  const obj = /** @type {Record<string, any>} */ (json);

  const base = obj.base_resp;
  if (base === null || typeof base !== "object") return null;
  // 先判类型再比较值。**而且空串必须单独挡住**：
  // `Number(null)` / `Number("")` / `Number([])` / `Number(false)` 全都是 0，
  // 只写 `Number(code) === 0` 会把 `status_code: ""` 当成成功 —— 那意味着
  // 上游返回一个空音频也被当作有效结果转给用户。这里对字符串额外要求「非空白」。
  const code = base.status_code;
  const okCode =
    (typeof code === "number" && code === 0) ||
    (typeof code === "string" && code.trim() !== "" && Number(code) === 0);
  if (!okCode) return null;

  const data = obj.data;
  if (data === null || typeof data !== "object") return null;
  const audio = data.audio;
  if (typeof audio !== "string" || audio === "") return null;

  const info = obj.extra_info !== null && typeof obj.extra_info === "object" ? obj.extra_info : {};
  return {
    audioHex: audio,
    usageCharacters: toNonNegativeInt(info.usage_characters),
    audioLength: toNonNegativeInt(info.audio_length),
  };
}

/**
 * hex → Buffer。
 *
 * **必须先正则校验**：`Buffer.from(hex, "hex")` 遇到非法字符是**静默截断**
 * （返回它读到的前半段），所以"解码成功但只有一半音频"这种故障不会抛错、
 * 只会让用户听到一段戛然而止的声音。先校验才能让长度检查有意义。
 *
 * @param {unknown} hex
 * @returns {Buffer | null}
 */
export function decodeHexAudio(hex) {
  if (typeof hex !== "string" || hex.length === 0 || hex.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
  const buf = Buffer.from(hex, "hex");
  return buf.length > 0 ? buf : null;
}

/**
 * 上游调用的结果。**写成可判别联合**（而不是"一堆可选字段"）：
 * 这样调用方 `if (!result.ok) { ...; return; }` 之后，`result.audio` 会被收窄成
 * `Buffer` 而不是 `Buffer | undefined` —— 否则"成功分支里 audio 可能为空"这件事
 * 只能靠人记住，编译器帮不上忙。对话侧的 `UpstreamResult` 没有这么写，那是因为
 * 它的字段恰好都能容忍 `undefined`（`reply` 直接进 JSON），这里不能。
 *
 * @typedef {{ ok: true, audio: Buffer, usageCharacters: number, audioLength: number, status: number }
 *   | { ok: false, reason: string, status?: number }} TtsUpstreamResult
 */

/**
 * 调上游 T2A。
 *
 * @param {{ apiBase: string, apiKey: string, ttsModel: string, ttsUpstreamTimeoutMs: number }} config
 * @param {{ voiceId: string, emotion: string, speed: number, vol: number, pitch: number }} voice
 * @param {string} text
 * @param {typeof fetch} [fetchImpl] 注入点：测试用它换成 stub，一次网络都不打
 * @returns {Promise<TtsUpstreamResult>}
 */
export async function callTtsUpstream(config, voice, text, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ttsUpstreamTimeoutMs);

  try {
    const res = await fetchImpl(`${config.apiBase}/t2a_v2`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(buildTtsPayload(config, voice, text)),
      signal: controller.signal,
    });

    if (!res.ok) {
      // 不读、不解析、不转发上游正文 —— 只留状态码。
      return { ok: false, reason: `upstream_http_${res.status}`, status: res.status };
    }

    let json;
    try {
      json = await res.json();
    } catch {
      return { ok: false, reason: "upstream_not_json", status: res.status };
    }

    const extracted = extractTtsAudio(json);
    if (!extracted) return { ok: false, reason: "upstream_shape", status: res.status };

    const audio = decodeHexAudio(extracted.audioHex);
    if (!audio) return { ok: false, reason: "upstream_audio_invalid", status: res.status };

    // 只回 `audio`，**不带 `audioHex`** —— 一份音频在内存里留两份是没必要的。
    return {
      ok: true,
      audio,
      usageCharacters: extracted.usageCharacters,
      audioLength: extracted.audioLength,
      status: res.status,
    };
  } catch (err) {
    const aborted = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
    return { ok: false, reason: aborted ? "upstream_timeout" : "upstream_network" };
  } finally {
    clearTimeout(timer);
  }
}
