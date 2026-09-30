/**
 * `chat-003` —— 前端纯逻辑层（`src/lib/chat-tts.ts`）。
 *
 * 这里测的是**判据本身**，不是"能跑通"：
 *   - 播放按钮该不该出现 —— 五种场景（京东云真回复 + 有音色的角色 / 真回复但角色
 *     一期没音色 / 降级台词 / GH 站 / 开场白）必须逐一对上；
 *   - **与后端音色表的一致性**：`TTS_SPEAKABLE_CHAR_KEYS` 直接读
 *     `server/lib/tts.mjs` 的 `TTS_VOICES` 比对，漂移即失败 —— 这条比任何
 *     "人工记得同步"都可靠；
 *   - `content-type` 不是 `audio/*` 时必须判失败 —— 静态站点/nginx 在路径没匹配上时
 *     会回 `index.html` + **HTTP 200**，只看状态码会把一整页 HTML 交给 `<audio>`
 *     （表现是"点了没反应"，且不报任何错）。
 *
 * 两个边界都是**实施/验收时才发现的**，写在这里防回归：
 *   ① 开场白的 `degraded` 也是 `null`，所以判据不能只用 `degraded === null`；
 *   ② 只判 `source === "model"` 不够 —— 一期无音色的角色（叶修 / 秦彻）会因此
 *      长出一个点不通的按钮，2026-09-29 线上验收实测到（`/api/tts` 回 404 no_voice）。
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CHAT_CLIENT_LIMITS } from "@/lib/chat-core";
import { CHAT_CHARACTERS, type ChatCharKey } from "@/lib/chat-keys";
import {
  TTS_CLIENT_LIMITS,
  TTS_ENDPOINT,
  TTS_SPEAKABLE_CHAR_KEYS,
  buildTtsRequest,
  interpretTtsResponse,
  shouldShowSpeakButton,
} from "@/lib/chat-tts";

/** 有音色的角色（一期只有夏以昼）。 */
const WITH_VOICE: ChatCharKey = "xia-yizhou";
/** 没有音色的角色 —— 两个都要覆盖到，避免"只测了一个"的假安全。 */
const WITHOUT_VOICE: ChatCharKey[] = ["ye-xiu", "qin-che"];

describe("播放按钮的显示判据", () => {
  it("京东云 + 真模型回复 + 有音色的角色 → 显示", () => {
    expect(shouldShowSpeakButton({ role: "assistant", source: "model" }, WITH_VOICE)).toBe(true);
  });

  it("真模型回复但该角色一期没有音色 → 不显示（否则是个点不通的按钮）", () => {
    // 2026-09-29 线上实测：叶修的回复长出了按钮，点下去 /api/tts 回 404 no_voice。
    for (const key of WITHOUT_VOICE) {
      expect(
        shouldShowSpeakButton({ role: "assistant", source: "model" }, key),
        key,
      ).toBe(false);
    }
  });

  it("降级台词（source=script）→ 不显示（本来也没有对应音频）", () => {
    expect(shouldShowSpeakButton({ role: "assistant", source: "script" }, WITH_VOICE)).toBe(false);
  });

  it("GitHub Pages / 本地 dev（回复全是台词库）→ 全部不显示", () => {
    // 服务端那侧 GH 的 Origin 必被 403，所以 GH 站永远拿不到 model 来源的回复。
    const ghMessages = [
      { role: "assistant" as const, source: "script" as const },
      { role: "assistant" as const, source: "script" as const },
    ];
    expect(ghMessages.some((m) => shouldShowSpeakButton(m, WITH_VOICE))).toBe(false);
  });

  it("开场白（站点自带的固定文案，source 缺省）→ 不显示", () => {
    // 这是最容易漏的一种：开场白的 degraded 也是 null，
    // 用 `degraded === null` 当判据会让它在 GH 站也长出按钮。
    expect(shouldShowSpeakButton({ role: "assistant" }, WITH_VOICE)).toBe(false);
    expect(shouldShowSpeakButton({ role: "assistant", source: undefined }, WITH_VOICE)).toBe(false);
  });

  it("用户自己的消息永远不显示", () => {
    expect(shouldShowSpeakButton({ role: "user", source: "model" }, WITH_VOICE)).toBe(false);
    expect(shouldShowSpeakButton({ role: "user" }, WITH_VOICE)).toBe(false);
  });

  it("只有已知角色 —— 集合里的 key 必须在 CHAT_CHARACTERS 内（拼错就是编译期/测试期错）", () => {
    const known = new Set<string>(CHAT_CHARACTERS.map((c) => c.key));
    for (const key of TTS_SPEAKABLE_CHAR_KEYS) {
      expect(known.has(key), key).toBe(true);
    }
  });
});

describe("与后端音色表的一致性（跨端漂移防线）", () => {
  /**
   * 前端集合必须与 `server/lib/tts.mjs` 的 `TTS_VOICES` 键集**逐字一致**。
   *
   * 为什么直接读源文件而不是各自维护一份常量：这两处的语义是同一个事实
   * （"哪些角色能出声"），分散在两个语言里，唯一可靠的对齐方式是让测试把它们
   * 放在一起比。新增音色时忘了改前端 → **显示层少一个按钮**（安全）；
   * 忘了改后端 → 这个测试红。两边都不会静默漂移。
   */
  it("TTS_SPEAKABLE_CHAR_KEYS === TTS_VOICES 的键集", () => {
    const src = readFileSync(new URL("../server/lib/tts.mjs", import.meta.url), "utf8");
    const start = src.indexOf("export const TTS_VOICES");
    expect(start, "在 server/lib/tts.mjs 里找不到 TTS_VOICES").toBeGreaterThan(-1);
    const block = src.slice(start, src.indexOf("\n});", start));
    const backendKeys = [...block.matchAll(/"([a-z0-9-]+)"\s*:\s*Object\.freeze\(\{/g)].map((m) => m[1]);
    expect(backendKeys.length, "从 TTS_VOICES 里一个键都没抽到（正则或格式变了）").toBeGreaterThan(0);
    expect(backendKeys.sort()).toEqual([...TTS_SPEAKABLE_CHAR_KEYS].sort());
  });
});

describe("请求体", () => {
  it("只有 charKey + text —— 没有声线、模型、情绪等任何合成参数", () => {
    const body = buildTtsRequest("xia-yizhou", "先把基础走一遍，急什么。");
    expect(Object.keys(body).sort()).toEqual(["charKey", "text"]);
    expect(body.charKey).toBe("xia-yizhou");
    // 这几个键一旦能由客户端传，这个接口就能被用来合成任意音色的语音。
    for (const forbidden of ["voice_id", "model", "emotion", "speed", "vol", "pitch", "output_format"]) {
      expect(body).not.toHaveProperty(forbidden);
    }
  });

  it("超长文本按对话同口径归一化后截断（服务端还会再裁一遍）", () => {
    expect(buildTtsRequest("xia-yizhou", "字".repeat(500)).text).toHaveLength(TTS_CLIENT_LIMITS.maxChars);
    expect(buildTtsRequest("xia-yizhou", "\n\n a\r\n\r\n\r\n\r\nb \n\n").text).toBe("a\n\nb");
  });

  it("接口路径与对话并列，不是它的参数分支", () => {
    expect(TTS_ENDPOINT).toBe("/api/tts");
  });

  it("客户端上限与对话同口径（助手回复本身就被限制在 200 字）", () => {
    expect(TTS_CLIENT_LIMITS.maxChars).toBe(CHAT_CLIENT_LIMITS.maxChars);
    // 比对话的 20 s 长：合成音频比生成文本慢。
    expect(TTS_CLIENT_LIMITS.timeoutMs).toBeGreaterThan(20_000);
  });
});

describe("响应判读", () => {
  it("200 + audio/mpeg → 可用（带 charset 等参数也一样）", () => {
    expect(interpretTtsResponse({ status: 200, contentType: "audio/mpeg" })).toEqual({ ok: true });
    expect(interpretTtsResponse({ status: 200, contentType: "audio/mpeg; charset=binary" })).toEqual({ ok: true });
    expect(interpretTtsResponse({ status: 200, contentType: "AUDIO/MPEG" })).toEqual({ ok: true });
  });

  it("200 但不是音频 → 不可用（SPA fallback 把 index.html 当 200 回的那条路径）", () => {
    for (const ct of ["text/html; charset=utf-8", "application/json", "", null, undefined]) {
      expect(interpretTtsResponse({ status: 200, contentType: ct ?? null }), String(ct)).toEqual({
        ok: false,
        reason: "unavailable",
      });
    }
  });

  it("状态码映射：429 配额 / 503 关停 / 403·404·405·413 不可用 / 其余错误", () => {
    expect(interpretTtsResponse({ status: 429, contentType: null })).toEqual({ ok: false, reason: "quota" });
    expect(interpretTtsResponse({ status: 503, contentType: null })).toEqual({ ok: false, reason: "disabled" });
    for (const status of [403, 404, 405, 413]) {
      expect(interpretTtsResponse({ status, contentType: null }), String(status)).toEqual({
        ok: false,
        reason: "unavailable",
      });
    }
    for (const status of [400, 500, 502, 504]) {
      expect(interpretTtsResponse({ status, contentType: null }), String(status)).toEqual({
        ok: false,
        reason: "error",
      });
    }
  });

  it("语义：429 仍可继续聊、503 是独立关停 —— 两者都只影响语音", () => {
    // 这条断言的意义在于**文案与行为的对应**：429 → "语音余量已满 · 稍后再试"，
    // 503 → "语音功能已暂停"，都不是"出错了"。
    expect(interpretTtsResponse({ status: 429, contentType: null }).ok).toBe(false);
    expect(interpretTtsResponse({ status: 503, contentType: null }).ok).toBe(false);
  });

  it("2xx 边界：199 / 300 都不算成功", () => {
    expect(interpretTtsResponse({ status: 199, contentType: "audio/mpeg" }).ok).toBe(false);
    expect(interpretTtsResponse({ status: 300, contentType: "audio/mpeg" }).ok).toBe(false);
    expect(interpretTtsResponse({ status: 204, contentType: "audio/mpeg" }).ok).toBe(true);
  });
});
