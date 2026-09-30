/**
 * `chat-003` —— TTS 的纯函数、上游契约、日志字段、配置默认值、状态持久化。
 *
 * 与 `chat-server-io.test.mjs` 同一条纪律：上游调用**全部走注入的 stub fetch**，
 * 一次网络都不打。真 Key 不该出现在测试里，而且"上游超时 / 非 JSON / HTTP 200 但
 * `status_code != 0`"这些分支用真接口根本构造不出来 —— 偏偏它们正是最需要被锁住的。
 *
 * 上游返回的音频用 `hex` 传输（见 `spec-chat-tts.md` §5.3），所以这里断言的是
 * **逐字节相同**，而不是"能解析出个东西"。
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { CHAR_KEY_BY_NAME } from "../server/lib/personas.mjs";
import {
  ALLOWED_TTS_TOP_LEVEL_KEYS,
  TTS_AUDIO_SETTING,
  TTS_VOICES,
  buildTtsPayload,
  callTtsUpstream,
  decodeHexAudio,
  extractTtsAudio,
  hasTtsVoice,
  parseTtsBody,
  reservedTtsKeysPresent,
} from "../server/lib/tts.mjs";
import { createLogger } from "../server/lib/logger.mjs";
import { emptyTtsState, loadTtsState, saveTtsState } from "../server/lib/state.mjs";
import { checkGlobalTtsLimit, dayKey, recordTtsSuccess } from "../server/lib/ratelimit.mjs";
import { DEFAULTS, REQUIRED_KEYS, loadConfig } from "../server/lib/config.mjs";

const CONFIG = {
  apiBase: "https://api.example.test/v1",
  apiKey: "test-key-not-real",
  ttsModel: "speech-2.8-turbo",
  ttsUpstreamTimeoutMs: 50,
};

const VOICE = TTS_VOICES["xia-yizhou"];

/** 一段假的 mp3 头 + 几个字节。用 hex 传，断言可以做到逐字节。 */
const AUDIO_BYTES = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x11, 0x22, 0x33]);
const AUDIO_HEX = AUDIO_BYTES.toString("hex");

const PARSE_OPTS = { maxChars: 200 };

/** 造一个 fetch stub。`respond` 收到 (url, init)，返回 Response。 */
function stubFetch(respond) {
  return vi.fn(async (url, init) => respond(url, init));
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** 一个正常的 T2A 响应。 */
function ttsOk(usageCharacters = 7, audioHex = AUDIO_HEX) {
  return jsonResponse({
    base_resp: { status_code: 0, status_msg: "success" },
    data: { audio: audioHex },
    extra_info: { audio_length: 1234, usage_characters: usageCharacters },
    trace_id: "0123456789abcdef",
  });
}

describe("音色表（一期只有一条）", () => {
  it("只有夏以昼有声；叶修/秦彻没有，且不做通用音色兜底", () => {
    expect(hasTtsVoice("xia-yizhou")).toBe(true);
    expect(hasTtsVoice("ye-xiu")).toBe(false);
    expect(hasTtsVoice("qin-che")).toBe(false);
    expect(hasTtsVoice("no-such-char")).toBe(false);
    expect(Object.keys(TTS_VOICES)).toEqual(["xia-yizhou"]);
  });

  it("原型链上的键不算音色（`in` 会把它算进去）", () => {
    // 用 `key in TTS_VOICES` 实现的话，这几个都会返回 true，
    // 于是一个构造出来的 charKey 就能带着 undefined 的 voice_id 打到上游。
    for (const k of ["toString", "constructor", "__proto__", "valueOf", "hasOwnProperty"]) {
      expect(hasTtsVoice(k), k).toBe(false);
    }
  });

  it("音色参数与 esp-claw 的 `config.json` 口径一致，且表是冻结的", () => {
    expect(VOICE).toEqual({ voiceId: "XiaYizhou01", emotion: "happy", speed: 1.0, vol: 8, pitch: 0 });
    expect(Object.isFrozen(TTS_VOICES)).toBe(true);
    expect(Object.isFrozen(VOICE)).toBe(true);
  });

  it("音色表的键必须都是已知 charKey（写成 typo 就永远是死条目）", () => {
    const known = new Set(Object.values(CHAR_KEY_BY_NAME));
    for (const key of Object.keys(TTS_VOICES)) {
      expect(known.has(key), `${key} 不在 CHAR_KEY_BY_NAME 里`).toBe(true);
    }
  });
});

describe("闸1 请求体白名单（TTS）", () => {
  const clean = { charKey: "xia-yizhou", text: "先把基础走一遍，急什么。" };

  it("顶层夹带合成参数时结果与不夹带逐字相同（被忽略，而非采纳，也不报错）", () => {
    const dirty = {
      ...clean,
      voice_id: "SomeOtherVoice",
      model: "speech-9.9-ultra",
      emotion: "angry",
      speed: 2,
      vol: 100,
      pitch: 9,
      output_format: "url",
      apiKey: "sk-should-be-ignored",
      stream: true,
    };
    // toEqual 是深比较 —— 多出任何字段、或任何取值受影响，都会失败。
    expect(parseTtsBody(dirty, PARSE_OPTS, hasTtsVoice)).toEqual(parseTtsBody(clean, PARSE_OPTS, hasTtsVoice));
    expect(parseTtsBody(dirty, PARSE_OPTS, hasTtsVoice).ok).toBe(true);
  });

  it("顶层白名单恰好是 charKey + text", () => {
    expect(ALLOWED_TTS_TOP_LEVEL_KEYS).toEqual(["charKey", "text"]);
    expect(reservedTtsKeysPresent({ charKey: "x", text: "y", voice_id: "z", system: "w" })).toEqual([
      "voice_id",
      "system",
    ]);
    expect(reservedTtsKeysPresent(clean)).toEqual([]);
    expect(reservedTtsKeysPresent(null)).toEqual([]);
  });

  it("没有音色的 charKey → no_voice（不是 bad_request）", () => {
    for (const bad of ["ye-xiu", "qin-che", "no-such-char", "", "toString"]) {
      const res = parseTtsBody({ charKey: bad, text: "你好" }, PARSE_OPTS, hasTtsVoice);
      expect(res.ok, bad).toBe(false);
      expect(res.code, bad).toBe("no_voice");
    }
  });

  it("charKey 缺失 / 非字符串同样归 no_voice（没有可执行的语义，不是'多带了字段'）", () => {
    for (const body of [{ text: "你好" }, { charKey: 42, text: "你好" }, { charKey: null, text: "你好" }]) {
      const res = parseTtsBody(body, PARSE_OPTS, hasTtsVoice);
      expect(res.ok).toBe(false);
      expect(res.code).toBe("no_voice");
    }
  });

  it("text 缺失 / 非字符串 / 空 / 只有空白 → bad_request", () => {
    for (const text of [undefined, null, 42, [], {}, "", "   ", "\n\n\t"]) {
      const res = parseTtsBody({ charKey: "xia-yizhou", text }, PARSE_OPTS, hasTtsVoice);
      expect(res.ok, JSON.stringify(text)).toBe(false);
      expect(res.code, JSON.stringify(text)).toBe("bad_request");
    }
  });

  it("body 不是对象 / 是数组 / 是 null 都被拒", () => {
    for (const bad of [null, 42, "string", [1, 2], true]) {
      const res = parseTtsBody(bad, PARSE_OPTS, hasTtsVoice);
      expect(res.ok).toBe(false);
      expect(res.code).toBe("bad_request");
    }
  });

  it("text 超上限**截断**而不是报错（与对话同口径：不打断用户）", () => {
    const res = parseTtsBody({ charKey: "xia-yizhou", text: "字".repeat(500) }, PARSE_OPTS, hasTtsVoice);
    expect(res.ok).toBe(true);
    expect(res.value.text).toHaveLength(200);

    const exact = parseTtsBody({ charKey: "xia-yizhou", text: "字".repeat(200) }, PARSE_OPTS, hasTtsVoice);
    expect(exact.value.text).toHaveLength(200);
  });

  it("text 先归一化再截断（顺序反了会让两端算出的长度对不上）", () => {
    const res = parseTtsBody(
      { charKey: "xia-yizhou", text: "\n\n a\r\n\r\n\r\n\r\nb \n\n" },
      PARSE_OPTS,
      hasTtsVoice,
    );
    expect(res.value.text).toBe("a\n\nb");
  });
});

describe("上游请求组装（闸3）", () => {
  it("音色与音频参数一律取服务端配置，客户端影响不到", () => {
    const payload = buildTtsPayload(CONFIG, VOICE, "你好");
    expect(payload.model).toBe("speech-2.8-turbo");
    expect(payload.text).toBe("你好");
    expect(payload.stream).toBe(false);
    expect(payload.voice_setting).toEqual({
      voice_id: "XiaYizhou01",
      speed: 1.0,
      vol: 8,
      pitch: 0,
      emotion: "happy",
    });
    expect(payload.audio_setting).toEqual({ sample_rate: 16000, bitrate: 128000, format: "mp3", channel: 1 });
    expect(payload.language_boost).toBe("Chinese");
  });

  it("传输用 hex 而不是 url（刻意与 esp-claw 的设备端取舍不同）", () => {
    expect(buildTtsPayload(CONFIG, VOICE, "你好").output_format).toBe("hex");
  });

  it("键集合固定：不携带任何客户端可控的额外字段", () => {
    const payload = buildTtsPayload(CONFIG, VOICE, "你好");
    expect(Object.keys(payload).sort()).toEqual(
      ["audio_setting", "language_boost", "model", "output_format", "stream", "text", "voice_setting"].sort(),
    );
    // 顶层不该出现 voice_id —— 它在 voice_setting 里，且只由服务端填。
    expect(payload.voice_id).toBeUndefined();
  });

  it("audio_setting 是冻结的共享常量（改一处不会污染别的请求）", () => {
    expect(TTS_AUDIO_SETTING.format).toBe("mp3");
    expect(Object.isFrozen(TTS_AUDIO_SETTING)).toBe(true);
  });
});

describe("上游响应解析与 hex 解码", () => {
  it("正常取音频；usage_characters 与 audio_length 一并带出", () => {
    expect(extractTtsAudio(JSON.parse(JSON.stringify({
      base_resp: { status_code: 0 },
      data: { audio: AUDIO_HEX },
      extra_info: { usage_characters: 12, audio_length: 3456 },
    })))).toEqual({ audioHex: AUDIO_HEX, usageCharacters: 12, audioLength: 3456 });
  });

  it("HTTP 200 但 status_code != 0 → null（绝不把半成品音频回给前端）", () => {
    for (const code of [1, 1004, 1008, -1, "1004"]) {
      expect(
        extractTtsAudio({ base_resp: { status_code: code, status_msg: "invalid voice" }, data: { audio: AUDIO_HEX } }),
        String(code),
      ).toBeNull();
    }
  });

  it("status_code 的类型陷阱：null / \"\" / [] 都不得被当成 0", () => {
    // Number(null) === 0、Number("") === 0、Number([]) === 0 —— 直接比 Number(code) 会误判成功。
    for (const code of [null, "", [], false, undefined, {}, "abc"]) {
      expect(extractTtsAudio({ base_resp: { status_code: code }, data: { audio: AUDIO_HEX } }), String(code)).toBeNull();
    }
    // 数字 0 与字符串 "0" 都放行（上游偶尔把数字回成字符串）。
    expect(extractTtsAudio({ base_resp: { status_code: 0 }, data: { audio: AUDIO_HEX } })).not.toBeNull();
    expect(extractTtsAudio({ base_resp: { status_code: "0" }, data: { audio: AUDIO_HEX } })).not.toBeNull();
  });

  it("data.audio 缺失 / 空 / 非字符串 → null", () => {
    for (const audio of [undefined, null, "", 42, [], {}]) {
      expect(extractTtsAudio({ base_resp: { status_code: 0 }, data: { audio } }), JSON.stringify(audio)).toBeNull();
    }
  });

  it("结构不对一律 null，而不是抛异常或返回空串", () => {
    for (const bad of [null, 42, "text", {}, { base_resp: { status_code: 0 } }, { data: { audio: AUDIO_HEX } }]) {
      expect(extractTtsAudio(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("extra_info 缺失 / 值异常 → 计数归 0 而不是 NaN（NaN 会让 state.json 变成非法 JSON）", () => {
    const res = extractTtsAudio({ base_resp: { status_code: 0 }, data: { audio: AUDIO_HEX } });
    expect(res).toEqual({ audioHex: AUDIO_HEX, usageCharacters: 0, audioLength: 0 });

    for (const v of [null, -5, "12", NaN, Infinity, {}]) {
      const r = extractTtsAudio({
        base_resp: { status_code: 0 },
        data: { audio: AUDIO_HEX },
        extra_info: { usage_characters: v },
      });
      expect(Number.isFinite(r.usageCharacters), JSON.stringify(v)).toBe(true);
      expect(r.usageCharacters).toBe(0);
    }
  });

  it("hex 解码：合法串逐字节相同", () => {
    expect(decodeHexAudio(AUDIO_HEX)).toEqual(AUDIO_BYTES);
    expect(decodeHexAudio("FFFB")).toEqual(Buffer.from([0xff, 0xfb]));
  });

  it("hex 解码：长度奇数 / 非法字符 / 空 → null", () => {
    // 关键：Node 的 Buffer.from(hex) 遇到非法字符是**静默截断**，
    // 所以"解码成功但只有一半音频"不会抛错、只会让用户听到戛然而止的声音。
    // 必须先正则校验，下面每个用例都是这条规则的守卫。
    for (const bad of ["fff", "", "zz", "0x41", "ff fb", "ff,fb", "4142g", null, 42, []]) {
      expect(decodeHexAudio(bad), JSON.stringify(bad)).toBeNull();
    }
    // 反向对照：如果只靠 Buffer.from，下面这条会返回 1 字节 —— 正是要避免的。
    expect(Buffer.from("zz", "hex").length).toBe(0);
    expect(decodeHexAudio("4100")).toEqual(Buffer.from([0x41, 0x00]));
  });
});

describe("上游调用的失败分支（不泄露、不悬挂）", () => {
  it("成功路径：带 Authorization，打到 base + /t2a_v2，字节逐字节一致", async () => {
    const fetchImpl = stubFetch(() => ttsOk(9));
    const res = await callTtsUpstream(CONFIG, VOICE, "你好", fetchImpl);
    expect(res.ok).toBe(true);
    expect(res.audio).toEqual(AUDIO_BYTES);
    expect(res.usageCharacters).toBe(9);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/t2a_v2");
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer test-key-not-real");
    expect(JSON.parse(init.body).voice_setting.voice_id).toBe("XiaYizhou01");
  });

  it("上游非 2xx：只留状态码，**不带任何上游正文**", async () => {
    const fetchImpl = stubFetch(
      () => new Response("invalid api key sk-live-abc123, account suspended", { status: 401 }),
    );
    const res = await callTtsUpstream(CONFIG, VOICE, "你好", fetchImpl);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("upstream_http_401");
    const dump = JSON.stringify(res);
    expect(dump).not.toContain("sk-live");
    expect(dump).not.toContain("suspended");
  });

  it("上游返回非 JSON → upstream_not_json", async () => {
    const fetchImpl = stubFetch(() => new Response("<html>bad gateway</html>", { status: 200 }));
    const res = await callTtsUpstream(CONFIG, VOICE, "你好", fetchImpl);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("upstream_not_json");
  });

  it("status_code != 0 → upstream_shape，且结果里**没有任何音频**", async () => {
    const fetchImpl = stubFetch(() =>
      jsonResponse({ base_resp: { status_code: 1004, status_msg: "invalid voice_id" }, data: { audio: "" } }),
    );
    const res = await callTtsUpstream(CONFIG, VOICE, "你好", fetchImpl);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("upstream_shape");
    expect(res.audio).toBeUndefined();
    expect(JSON.stringify(res)).not.toContain("invalid voice_id");
  });

  it("hex 非法 → upstream_audio_invalid（不是 upstream_shape）", async () => {
    const fetchImpl = stubFetch(() => ttsOk(7, "zz-not-hex"));
    const res = await callTtsUpstream(CONFIG, VOICE, "你好", fetchImpl);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("upstream_audio_invalid");
  });

  it("超时被 abort → upstream_timeout", async () => {
    const fetchImpl = stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
    );
    const res = await callTtsUpstream(CONFIG, VOICE, "你好", fetchImpl);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("upstream_timeout");
  });

  it("网络异常 → upstream_network，且不泄露地址", async () => {
    const fetchImpl = stubFetch(() => {
      throw new Error("ECONNREFUSED 10.0.0.9:443");
    });
    const res = await callTtsUpstream(CONFIG, VOICE, "你好", fetchImpl);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("upstream_network");
    expect(JSON.stringify(res)).not.toContain("ECONNREFUSED");
  });
});

describe("日志隐私（TTS 行）", () => {
  it("tts 行恰好 8 个字段，含 chars 与 kind", () => {
    const lines = [];
    const log = createLogger((line) => lines.push(line));
    log.tts({ ipHash: "a1b2c3d4e5f60718", charKey: "xia-yizhou", chars: 12, status: 200, durationMs: 812 });

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(Object.keys(parsed).sort()).toEqual(
      ["charKey", "chars", "degradedReason", "durationMs", "ipHash", "kind", "status", "ts"].sort(),
    );
    expect(parsed.kind).toBe("tts");
    expect(parsed.chars).toBe(12);
    expect(parsed.degradedReason).toBeNull();
  });

  it("对话行与 TTS 行的字段集合**不同**（各自固定，不互相污染）", () => {
    const lines = [];
    const log = createLogger((line) => lines.push(line));
    log.request({ ipHash: "h", charKey: "xia-yizhou", turns: 2, status: 200, durationMs: 1 });
    log.tts({ ipHash: "h", charKey: "xia-yizhou", chars: 12, status: 200, durationMs: 1 });
    const [chatLine, ttsLine] = lines.map((l) => JSON.parse(l));
    expect(chatLine.turns).toBe(2);
    expect(chatLine.chars).toBeUndefined();
    expect(ttsLine.chars).toBe(12);
    expect(ttsLine.turns).toBeUndefined();
  });

  it("全量扫描：没有正文、没有原始 IP、没有音频字节", () => {
    const lines = [];
    const log = createLogger((line) => lines.push(line));
    const secret = "我今天说了什么不该被记下来的话";
    const rawIp = "203.0.113.7";

    log.tts({ ipHash: "aaaaaaaaaaaaaaaa", charKey: null, chars: 0, status: 503, degradedReason: "disabled", durationMs: 2 });
    log.tts({ ipHash: "aaaaaaaaaaaaaaaa", charKey: "xia-yizhou", chars: secret.length, status: 200, durationMs: 900 });
    log.alert("tts_circuit_open", { requests: 300 });

    const all = lines.join("\n");
    expect(all).not.toContain(secret);
    expect(all).not.toContain(rawIp);
    expect(all).not.toContain(AUDIO_HEX);
  });
});

describe("配置默认值（与 spec §8 逐条一致）", () => {
  const FULL_ENV = {
    MINIMAX_API_KEY: "k",
    MINIMAX_MODEL: "M2-her",
    CHAT_IP_SALT: "s",
    TTS_MODEL: "speech-2.8-turbo",
  };

  it("TTS 各项默认值", () => {
    const { config, errors } = loadConfig(FULL_ENV);
    expect(errors).toEqual([]);
    expect(config.ttsEnabled).toBe(true);
    expect(config.ttsModel).toBe("speech-2.8-turbo");
    expect(config.ttsMaxChars).toBe(200);
    expect(config.ttsIpWindowMax).toBe(10);
    expect(config.ttsIpWindowSec).toBe(300);
    expect(config.ttsIpDailyMax).toBe(60);
    expect(config.ttsDailyMax).toBe(300);
    expect(config.ttsUpstreamTimeoutMs).toBe(30000);
    expect(DEFAULTS.TTS_UPSTREAM_TIMEOUT_MS).toBe(30000);
  });

  it("TTS_ENABLED 只有显式 false/0 才算关停（显式关停时不必给 TTS_MODEL）", () => {
    const off = loadConfig({ MINIMAX_API_KEY: "k", MINIMAX_MODEL: "m", CHAT_IP_SALT: "s", TTS_ENABLED: "false" });
    expect(off.errors).toEqual([]);
    expect(off.config.ttsEnabled).toBe(false);
    expect(off.config.ttsModel).toBe("");
    expect(loadConfig({ ...FULL_ENV, TTS_ENABLED: "0" }).config.ttsEnabled).toBe(false);
  });

  it("TTS_MODEL 缺失**不是致命配置**（缺它只该关掉 TTS，不该连对话一起打不起来）", () => {
    // 这条是刻意的取舍：把 TTS_MODEL 放进 REQUIRED_KEYS 会让一次普通的镜像升级
    // （忘补新变量）把**对话**一起弄挂。缺它不会"静默用错东西"，只会"干不了这件事"，
    // 所以由入口记告警 + /api/tts 回 503，而不是 process.exit。
    expect(REQUIRED_KEYS).toEqual(["MINIMAX_API_KEY", "MINIMAX_MODEL", "CHAT_IP_SALT"]);
    const { config, errors } = loadConfig({ MINIMAX_API_KEY: "k", MINIMAX_MODEL: "m", CHAT_IP_SALT: "s" });
    expect(errors).toEqual([]);
    expect(config.ttsModel).toBe("");
    expect(config.ttsEnabled).toBe(true); // 开关仍开着，但路由会因为没模型而回 503
  });

  it("TTS 的限额能被覆盖，且非法值记错而不是静默回落", () => {
    const { config } = loadConfig({
      ...FULL_ENV,
      TTS_DAILY_MAX: "5",
      TTS_IP_WINDOW_MAX: "abc",
      TTS_MAX_CHARS: "0",
    });
    expect(config.ttsDailyMax).toBe(5);
    expect(config.ttsIpWindowMax).toBe(10); // 非整数 → 记错并回落到默认值
    expect(config.ttsMaxChars).toBe(200); // 0 不是正整数 → 记错 + 回落
  });
});

describe("TTS 计数持久化（独立于对话的 state.json）", () => {
  it("写进去再读出来是同一条记录", () => {
    const dir = mkdtempSync(join(tmpdir(), "tts-state-"));
    expect(saveTtsState(dir, { day: "2026-09-28", requests: 12, characters: 3450 }).ok).toBe(true);
    expect(loadTtsState(dir)).toEqual({ day: "2026-09-28", requests: 12, characters: 3450 });
  });

  it("落盘的是纯 ASCII JSON，只含计数（多一个键都不写）", () => {
    const dir = mkdtempSync(join(tmpdir(), "tts-state-"));
    saveTtsState(dir, { day: "2026-09-28", requests: 3, characters: 90 });
    const raw = readFileSync(join(dir, "tts-state.json"), "utf8");
    expect(raw).toMatch(/^\{"day":"\d{4}-\d{2}-\d{2}","requests":\d+,"characters":\d+\}$/);
  });

  it("目录不存在时会先建出来", () => {
    const dir = mkdtempSync(join(tmpdir(), "tts-state-"));
    const nested = join(dir, "state", "deeper");
    expect(saveTtsState(nested, { day: "2026-09-28", requests: 1, characters: 2 }).ok).toBe(true);
    expect(loadTtsState(nested).requests).toBe(1);
  });

  it("文件缺失 / 损坏 / 结构不对都退化成全新开始，而不是抛错", () => {
    const dir = mkdtempSync(join(tmpdir(), "tts-state-"));
    expect(loadTtsState(dir)).toEqual({ day: "", requests: 0, characters: 0 });
    expect(emptyTtsState()).toEqual({ day: "", requests: 0, characters: 0 });

    for (const junk of ["", "{", "null", "[]", '{"day":1}', '{"requests":3}', '{"day":"2026-09-28","requests":-5,"characters":"x"}']) {
      writeFileSync(join(dir, "tts-state.json"), junk, "utf8");
      const loaded = loadTtsState(dir);
      expect(Number.isFinite(loaded.requests), junk).toBe(true);
      expect(loaded.requests).toBeGreaterThanOrEqual(0);
      expect(loaded.characters).toBeGreaterThanOrEqual(0);
    }
  });

  it("写入失败返回 ok:false 而不抛错", () => {
    const dir = mkdtempSync(join(tmpdir(), "tts-state-"));
    const asFile = join(dir, "not-a-dir");
    writeFileSync(asFile, "x", "utf8");
    const res = saveTtsState(join(asFile, "state"), { day: "2026-09-28", requests: 1, characters: 1 });
    expect(res.ok).toBe(false);
    expect(typeof res.error).toBe("string");
  });
});

describe("TTS 全局熔断计数", () => {
  const t0 = new Date(2026, 8, 28, 12, 0, 0).getTime();

  it("日计数达上限即拒，且只读不递增", () => {
    const record = { day: dayKey(t0), requests: 299, characters: 1000 };
    expect(checkGlobalTtsLimit(record, t0, 300).allowed).toBe(true);
    expect(record.requests).toBe(299); // 判定不能改动记录

    expect(checkGlobalTtsLimit({ day: dayKey(t0), requests: 300, characters: 0 }, t0, 300).allowed).toBe(false);
  });

  it("跨天归零（昨天的满额不影响今天）", () => {
    expect(checkGlobalTtsLimit({ day: dayKey(t0 - 86400_000), requests: 300, characters: 0 }, t0, 300).allowed).toBe(
      true,
    );
    expect(checkGlobalTtsLimit({ day: "", requests: 300, characters: 0 }, t0, 300).allowed).toBe(true);
  });

  it("成功后次数 +1 且字符账本累加", () => {
    const a = recordTtsSuccess({ day: dayKey(t0), requests: 7, characters: 100 }, t0, 12);
    expect(a).toEqual({ day: dayKey(t0), requests: 8, characters: 112 });
  });

  it("跨天时**次数与账本一起归零**（账本是当日的，累加会把对账数字弄废）", () => {
    const b = recordTtsSuccess({ day: "2000-01-01", requests: 299, characters: 99999 }, t0, 5);
    expect(b).toEqual({ day: dayKey(t0), requests: 1, characters: 5 });
  });

  it("异常 usage_characters 一律记 0（不让它变成误封的依据，也不写 NaN）", () => {
    for (const v of [undefined, null, NaN, Infinity, -3, "12", {}]) {
      const r = recordTtsSuccess({ day: dayKey(t0), requests: 1, characters: 10 }, t0, v);
      expect(Number.isFinite(r.characters), JSON.stringify(v)).toBe(true);
      expect(r.characters).toBe(10);
      expect(r.requests).toBe(2);
    }
  });
});
