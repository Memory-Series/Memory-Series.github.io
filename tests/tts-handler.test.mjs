/**
 * `chat-003` —— **处理器级**验收：六道闸的顺序、以及「所有拒绝路径零上游调用」。
 *
 * 为什么必须做到这一层：`tts-server.test.mjs` 只证明"每个零件是对的"，
 * 证明不了"零件是按这个顺序装的"。而 TTS 按**字符**计费 —— 「拒绝发生在上游调用之前」
 * 这件事只能通过在处理器上挂一个**只数次数**的 fetch stub 来证明，
 * 别的测法（读代码、看日志）都不构成证据。
 *
 * 这里不打真 Key、不发一次网络：`fetchImpl` 是注入的 stub，
 * 它被调用几次本身就是断言对象。
 *
 * 另附两条只有这一层才验得了的：
 *   - 对话与 TTS 的 IP 限额**互不影响**（两张独立的计数表）；
 *   - TTS 的日熔断写进 `tts-state.json`，**换一个处理器实例（≈重启）后仍然生效**。
 */
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { createRequestHandler } from "../server/index.mjs";
import { createLogger } from "../server/lib/logger.mjs";
import { loadConfig } from "../server/lib/config.mjs";

const ORIGIN = "https://www.traceinhabit.cn";
const TTS_URL = "/api/tts";
const CHAT_URL = "/api/chat";

const AUDIO_BYTES = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x11, 0x22, 0x33]);
const AUDIO_HEX = AUDIO_BYTES.toString("hex");

const PERSONAS = new Map([
  ["xia-yizhou", { charKey: "xia-yizhou", name: "夏以昼", systemPrompt: "你是夏以昼。" }],
]);

// ------------------------------------------------------------------ 测试替身

/**
 * 假的 `IncomingMessage`。真实实现是流式的，所以这里也**异步**触发
 * `data` / `end` —— 同步触发的话 `readBody` 里 "先注册监听再 resolve" 的顺序
 * 就永远得不到检验（而那个顺序正是它正确的原因）。
 */
function makeReq({ url, method = "POST", headers = {}, body = "", ip = "203.0.113.9" }) {
  /** @type {Record<string, Array<(arg?: unknown) => void>>} */
  const listeners = {};
  const req = {
    url,
    method,
    headers,
    socket: { remoteAddress: ip },
    on(event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
      return req;
    },
  };
  queueMicrotask(() => {
    for (const fn of listeners.data ?? []) fn(Buffer.from(body, "utf8"));
    for (const fn of listeners.end ?? []) fn();
  });
  return req;
}

function makeRes() {
  const res = {
    statusCode: 0,
    /** @type {Record<string, string | number>} */
    headers: {},
    /** @type {Buffer[]} */
    chunks: [],
    writeHead(status, headers) {
      res.statusCode = status;
      res.headers = headers ?? {};
      return res;
    },
    end(chunk) {
      if (chunk !== undefined && chunk !== null) {
        res.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), "utf8"));
      }
    },
  };
  return res;
}

const bodyOf = (res) => Buffer.concat(res.chunks);
const jsonOf = (res) => JSON.parse(bodyOf(res).toString("utf8"));

function freshStateDir() {
  return mkdtempSync(join(tmpdir(), "tts-handler-"));
}

/**
 * 用**真实的 `loadConfig`** 组装配置（而不是手写一个对象字面量）——
 * 这样"环境变量 → config"的映射本身也在验收范围内：写错一个变量名不会静默通过。
 */
function configFrom(env = {}) {
  const { config, errors } = loadConfig({
    MINIMAX_API_KEY: "test-key-not-real",
    MINIMAX_MODEL: "M2-her",
    CHAT_IP_SALT: "salt",
    TTS_MODEL: "speech-2.8-turbo",
    MINIMAX_API_BASE: "https://api.example.test/v1",
    CHAT_UPSTREAM_TIMEOUT_MS: "50",
    TTS_UPSTREAM_TIMEOUT_MS: "50",
    CHAT_STATE_DIR: freshStateDir(),
    ...env,
  });
  if (errors.length > 0) throw new Error(`测试配置有误：${errors.join(" / ")}`);
  return config;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** 默认上游：按 URL 分流（同一个 fetchImpl 服务两条路径）。 */
function okRespond(url) {
  if (String(url).endsWith("/t2a_v2")) {
    return jsonResponse({
      base_resp: { status_code: 0, status_msg: "success" },
      data: { audio: AUDIO_HEX },
      extra_info: { audio_length: 900, usage_characters: 6 },
    });
  }
  return jsonResponse({ choices: [{ message: { content: "先把基础走一遍，急什么。" } }] });
}

function makeHarness(env = {}, respond = okRespond) {
  const config = configFrom(env);
  /** @type {string[]} */
  const lines = [];
  const log = createLogger((line) => lines.push(line));
  const fetchImpl = vi.fn(async (url, init) => respond(url, init));
  const handler = createRequestHandler({ config, personas: PERSONAS, log, fetchImpl });
  return { config, lines, fetchImpl, handler };
}

/**
 * 发一次请求。
 *
 * `rawBody` 用于构造"非 JSON"与"超长"这类 body；`origin: null` 表示**不带** Origin 头；
 * `content-length` 按实际字节写，与服务端 `readBody` 的先验检查一致。
 */
async function send(handler, path, { body, rawBody, origin = ORIGIN, method = "POST", ip = "203.0.113.9" } = {}) {
  const text = rawBody !== undefined ? rawBody : JSON.stringify(body ?? {});
  /** @type {Record<string, string>} */
  const headers = { "content-length": String(Buffer.byteLength(text, "utf8")) };
  if (origin !== null) headers.origin = origin;
  const req = makeReq({ url: path, method, headers, body: text, ip });
  const res = makeRes();
  await handler(req, res);
  return res;
}

const tts = (handler, opts) => send(handler, TTS_URL, { body: { charKey: "xia-yizhou", text: "你好" }, ...opts });

const chat = (handler, opts) =>
  send(handler, CHAT_URL, {
    body: { charKey: "xia-yizhou", messages: [{ role: "user", content: "你好" }] },
    ...opts,
  });

// ------------------------------------------------------------------ 正常路径

describe("正常路径（逐字节）", () => {
  it("200 + audio/mpeg + private,no-store，且字节与上游 hex 逐字节相同", async () => {
    const { handler, fetchImpl } = makeHarness();
    const res = await tts(handler);

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("audio/mpeg");
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(res.headers["content-length"]).toBe(AUDIO_BYTES.length);
    // 逐字节 —— 不是"长度对得上"，是每一个字节都对得上。
    expect(bodyOf(res)).toEqual(AUDIO_BYTES);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("夹带 voice_id / model / emotion / speed / vol / apiKey 时：**请求体与响应都逐字相同**", async () => {
    const cleanH = makeHarness();
    const dirtyH = makeHarness();

    const cleanRes = await tts(cleanH.handler, { body: { charKey: "xia-yizhou", text: "你好" } });
    const dirtyRes = await tts(dirtyH.handler, {
      body: {
        charKey: "xia-yizhou",
        text: "你好",
        voice_id: "SomeOtherVoice",
        model: "speech-9.9-ultra",
        emotion: "angry",
        speed: 2,
        vol: 100,
        pitch: 9,
        output_format: "url",
        apiKey: "sk-should-be-ignored",
      },
    });

    expect(dirtyRes.statusCode).toBe(200);
    expect(bodyOf(dirtyRes)).toEqual(bodyOf(cleanRes));
    // 关键：打到上游的**请求体**也必须一模一样 —— 否则说明客户端确实影响了合成参数。
    expect(dirtyH.fetchImpl.mock.calls[0][1].body).toBe(cleanH.fetchImpl.mock.calls[0][1].body);
  });

  it("text 超上限时**截断后合成**（不报错），且上游收到的就是截断后的文本", async () => {
    const { handler, fetchImpl } = makeHarness({ TTS_MAX_CHARS: "10" });
    const res = await tts(handler, { body: { charKey: "xia-yizhou", text: "字".repeat(50) } });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).text).toBe("字".repeat(10));
  });
});

// ------------------------------------------------------------------ 拒绝路径

describe("拒绝路径：状态码与错误码", () => {
  it("charKey 无音色 → 404 no_voice", async () => {
    for (const charKey of ["ye-xiu", "qin-che", "no-such-char"]) {
      const { handler, fetchImpl } = makeHarness();
      const res = await tts(handler, { body: { charKey, text: "你好" } });
      expect(res.statusCode, charKey).toBe(404);
      expect(jsonOf(res).error.code, charKey).toBe("no_voice");
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it("text 缺失 / 非字符串 / 空 → 400 bad_request", async () => {
    for (const body of [{ charKey: "xia-yizhou" }, { charKey: "xia-yizhou", text: 42 }, { charKey: "xia-yizhou", text: "   " }]) {
      const { handler } = makeHarness();
      const res = await tts(handler, { body });
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
      expect(jsonOf(res).error.code).toBe("bad_request");
    }
  });

  it("非 POST → 405；非白名单 Origin → 403；无 Origin → 403", async () => {
    const a = await tts(makeHarness().handler, { method: "GET" });
    expect(a.statusCode).toBe(405);
    expect(jsonOf(a).error.code).toBe("method_not_allowed");

    const b = await tts(makeHarness().handler, { origin: "https://evil.example" });
    expect(b.statusCode).toBe(403);
    expect(jsonOf(b).error.code).toBe("forbidden_origin");

    const c = await tts(makeHarness().handler, { origin: null });
    expect(c.statusCode).toBe(403);

    // GH Pages 的 Origin 必然不在白名单 —— 这就是"GH 侧没有语音"的服务端一侧。
    const d = await tts(makeHarness().handler, { origin: "https://memory-series.github.io" });
    expect(d.statusCode).toBe(403);
  });

  it("body 超 32 KB → 413；非法 JSON → 400", async () => {
    const big = await tts(makeHarness().handler, { rawBody: "x".repeat(33 * 1024) });
    expect(big.statusCode).toBe(413);
    expect(jsonOf(big).error.code).toBe("payload_too_large");

    const bad = await tts(makeHarness().handler, { rawBody: "{ not json" });
    expect(bad.statusCode).toBe(400);
  });
});

describe("限额三档（429）", () => {
  it("窗口内第 N+1 次 → ip_rate", async () => {
    const { handler, fetchImpl } = makeHarness({ TTS_IP_WINDOW_MAX: "2" });
    expect((await tts(handler)).statusCode).toBe(200);
    expect((await tts(handler)).statusCode).toBe(200);

    const blocked = await tts(handler);
    expect(blocked.statusCode).toBe(429);
    expect(jsonOf(blocked).error).toEqual({ code: "rate_limited", reason: "ip_rate" });
    // 被拒绝的那次不该打到上游（IP 计数在第 3 次已经拦住它）。
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("日内第 N+1 次 → ip_daily", async () => {
    const { handler } = makeHarness({ TTS_IP_WINDOW_MAX: "1000", TTS_IP_DAILY_MAX: "2" });
    expect((await tts(handler)).statusCode).toBe(200);
    expect((await tts(handler)).statusCode).toBe(200);

    const blocked = await tts(handler);
    expect(blocked.statusCode).toBe(429);
    expect(jsonOf(blocked).error.reason).toBe("ip_daily");
  });

  it("全局日熔断 → tts_daily", async () => {
    const { handler } = makeHarness({ TTS_DAILY_MAX: "1" });
    expect((await tts(handler)).statusCode).toBe(200);

    const blocked = await tts(handler);
    expect(blocked.statusCode).toBe(429);
    expect(jsonOf(blocked).error.reason).toBe("tts_daily");
  });

  it("IP 计数在**每次通过校验的请求**上就记（含上游失败）—— 防刷优先于省钱", async () => {
    const { handler, fetchImpl } = makeHarness({ TTS_IP_WINDOW_MAX: "2" }, () => new Response("boom", { status: 500 }));
    expect((await tts(handler)).statusCode).toBe(502);
    expect((await tts(handler)).statusCode).toBe(502);

    // 两次都失败了，但 IP 额度已经用完 —— 否则"打不过就刷"会绕开限额。
    const blocked = await tts(handler);
    expect(blocked.statusCode).toBe(429);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("关停与上游失败", () => {
  it("TTS_ENABLED=false → 503，且**对话完全不受影响**", async () => {
    const { handler, fetchImpl } = makeHarness({ TTS_ENABLED: "false" });

    const t = await tts(handler);
    expect(t.statusCode).toBe(503);
    expect(jsonOf(t).error.code).toBe("disabled");

    const c = await chat(handler);
    expect(c.statusCode).toBe(200);
    expect(jsonOf(c).reply).toBe("先把基础走一遍，急什么。");

    // 503 发生在计费之前；200 那次才是唯一的上游调用。
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][0])).toContain("/chat/completions");
  });

  it("缺 TTS_MODEL → 503 disabled（不是启动失败，也不猜一个模型名）", async () => {
    const { handler, fetchImpl } = makeHarness({ TTS_MODEL: "" });
    const res = await tts(handler);
    expect(res.statusCode).toBe(503);
    expect(jsonOf(res).error.code).toBe("disabled");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("上游四分支（500 / 非 JSON / status_code≠0 / hex 非法）都 → 502，且响应体不含上游原文", async () => {
    const cases = [
      ["http 500", () => new Response("upstream says: invalid api key sk-live-abc, suspended", { status: 500 })],
      ["not json", () => new Response("<html>bad gateway</html>", { status: 200 })],
      [
        "status_code!=0",
        () => jsonResponse({ base_resp: { status_code: 1004, status_msg: "invalid voice_id" }, data: { audio: "" } }),
      ],
      [
        "hex 非法",
        () =>
          jsonResponse({ base_resp: { status_code: 0 }, data: { audio: "zz-not-hex" }, extra_info: { usage_characters: 3 } }),
      ],
    ];

    for (const [name, respond] of cases) {
      const { handler } = makeHarness({}, respond);
      const res = await tts(handler);
      expect(res.statusCode, name).toBe(502);
      expect(jsonOf(res).error.code, name).toBe("upstream_error");
      const text = bodyOf(res).toString("utf8");
      expect(text, name).not.toContain("sk-live");
      expect(text, name).not.toContain("suspended");
      expect(text, name).not.toContain("invalid voice_id");
      expect(text, name).not.toContain("bad gateway");
    }
  });

  it("上游超时 → 502（服务端自己掐，不把悬挂连接留给客户端）", async () => {
    const neverRespond = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    const { handler } = makeHarness({}, neverRespond);
    const res = await tts(handler);
    expect(res.statusCode).toBe(502);
  });
});

// ------------------------------------------------------------------ 计费前置

describe("计费前置：所有拒绝路径的上游调用次数恰好为 0", () => {
  /** 每个用例单独一个处理器 —— 否则前一个用例的 IP 计数会污染后一个。 */
  const REJECT_CASES = [
    ["405 非 POST", {}, { method: "GET" }],
    ["403 无 Origin", {}, { origin: null }],
    ["403 非白名单 Origin", {}, { origin: "https://evil.example" }],
    ["413 body 超限", {}, { rawBody: "x".repeat(33 * 1024) }],
    ["400 非 JSON", {}, { rawBody: "{ not json" }],
    ["400 text 缺失", {}, { body: { charKey: "xia-yizhou" } }],
    ["404 no_voice", {}, { body: { charKey: "ye-xiu", text: "你好" } }],
    ["429 ip_rate", { TTS_IP_WINDOW_MAX: "1" }, { twice: true }],
    ["503 disabled", { TTS_ENABLED: "false" }, {}],
    ["503 无 TTS_MODEL", { TTS_MODEL: "" }, {}],
  ];

  it.each(REJECT_CASES)("%s：stub 被调用 0 次", async (_name, env, opts) => {
    const { handler, fetchImpl } = makeHarness(env);
    if (opts.twice) {
      // 先把唯一的一次额度用掉，再发一次真正被 429 拦下的请求。
      const first = await tts(handler);
      expect(first.statusCode).toBe(200);
      fetchImpl.mockClear();
    }
    const res = await tts(handler, opts);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(fetchImpl).toHaveBeenCalledTimes(0);
  });

  it("正向对照：成功路径恰好 1 次（证明计数器本身有效，不是永远为 0）", async () => {
    const { handler, fetchImpl } = makeHarness();
    await tts(handler);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

// ------------------------------------------------------------------ 独立性与持久化

describe("独立性与持久化", () => {
  it("对话与 TTS 的 IP 限额**互不影响**（两张独立的计数表）", async () => {
    const { handler } = makeHarness({ TTS_IP_WINDOW_MAX: "1" });

    expect((await tts(handler)).statusCode).toBe(200);
    const ttsBlocked = await tts(handler);
    expect(ttsBlocked.statusCode).toBe(429);

    // 同一个 IP、同一个处理器，对话仍然畅通 —— 否则"关掉语音"会连聊天一起限制。
    const c = await chat(handler);
    expect(c.statusCode).toBe(200);
  });

  it("TTS 计数写进 tts-state.json，**换一个处理器实例后仍然生效**（≈容器重启）", async () => {
    const stateDir = freshStateDir();
    const env = { CHAT_STATE_DIR: stateDir, TTS_DAILY_MAX: "1" };

    const before = makeHarness(env);
    expect((await tts(before.handler)).statusCode).toBe(200);

    const raw = JSON.parse(readFileSync(join(stateDir, "tts-state.json"), "utf8"));
    expect(raw.requests).toBe(1);
    expect(raw.characters).toBe(6); // extra_info.usage_characters

    // 新实例会重新 loadTtsState —— 日熔断因此不会"重启即清零"。
    const after = makeHarness(env);
    const blocked = await tts(after.handler);
    expect(blocked.statusCode).toBe(429);
    expect(jsonOf(blocked).error.reason).toBe("tts_daily");
  });

  it("TTS 只写 tts-state.json，不碰对话那份 state.json", async () => {
    const stateDir = freshStateDir();
    const { handler } = makeHarness({ CHAT_STATE_DIR: stateDir });
    await tts(handler);

    expect(existsSync(join(stateDir, "tts-state.json"))).toBe(true);
    expect(existsSync(join(stateDir, "state.json"))).toBe(false);
  });
});

// ------------------------------------------------------------------ 日志与边角

describe("日志与边角", () => {
  it("每次 TTS 请求恰好一行、恰好 8 字段；**没有正文、没有原始 IP**", async () => {
    const { handler, lines } = makeHarness();
    const secret = "这是一句不该出现在日志里的角色台词";
    await tts(handler, { body: { charKey: "xia-yizhou", text: secret } });

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(Object.keys(parsed).sort()).toEqual(
      ["charKey", "chars", "degradedReason", "durationMs", "ipHash", "kind", "status", "ts"].sort(),
    );
    expect(parsed.chars).toBe(secret.length); // 长度，不是内容
    expect(parsed.status).toBe(200);

    expect(lines.join("\n")).not.toContain(secret);
    expect(lines.join("\n")).not.toContain("203.0.113.9");
  });

  it("拒绝路径也各记一行（运维要能按状态码看出被拦在哪一档）", async () => {
    const { handler, lines } = makeHarness();
    await tts(handler, { body: { charKey: "ye-xiu", text: "你好" } });
    await tts(handler, { origin: null });

    expect(lines).toHaveLength(2);
    expect(lines.map((l) => JSON.parse(l).degradedReason)).toEqual(["no_voice", "forbidden_origin"]);
  });

  it("/api/health 仍可用，未知路径仍是 404", async () => {
    const { handler } = makeHarness();
    const health = await send(handler, "/api/health", { method: "GET", origin: null, rawBody: "" });
    expect(health.statusCode).toBe(200);
    expect(jsonOf(health)).toEqual({ ok: true, enabled: true });

    const nope = await send(handler, "/api/nope", { origin: null, rawBody: "" });
    expect(nope.statusCode).toBe(404);
    expect(jsonOf(nope).error.code).toBe("not_found");
  });
});
