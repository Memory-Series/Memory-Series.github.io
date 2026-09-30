#!/usr/bin/env node
// @ts-check
/**
 * 网页端对话 / 语音服务（C1 极薄代理）—— 服务端入口。
 *
 * 这个进程的全部职责：把浏览器的请求变成一次上游调用，并把六道闸全部挡在上游之前。
 * **它不生成任何内容**，也不持有任何用户数据。两条路径：
 *
 *   `POST /api/chat` —— `{charKey, messages}` → 上游 chat/completions → 回复文本
 *   `POST /api/tts`  —— `{charKey, text}`     → 上游 t2a_v2           → mp3 字节
 *
 * 零 npm 依赖（只用 `node:*` 内置模块）。这不是洁癖 —— 容器跑在
 * `--read-only` 根 FS 下、镜像要能长期不重建，任何依赖都会变成"下次更新
 * 得重装一遍"的负担；而这个服务的规模（两条路径、两个上游）也确实不需要框架。
 *
 * 请求处理顺序是**有讲究的**，不是随手排的（两条路径一致）：
 *   关停 → 出口 → 体积 → 结构 → 限额 → 熔断 → 上游
 * 越便宜的检查越靠前；且**所有拒绝都发生在计费之前**（闸 1 的存在意义）。
 * 在 TTS 这条路径上这条纪律更值钱 —— 它按**字符**计费，验错一次就是真金白银。
 *
 * `createRequestHandler` 被单独导出（不在 `main` 里内联）**是为了可测**：
 * 测试可以注入一个只数调用次数、不发网络的 `fetchImpl`，从而断言
 * 「所有拒绝路径的上游调用次数恰好为 0」。这条断言只有拿到处理器本身才写得出来。
 */
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { loadConfig } from "./lib/config.mjs";
import { parseChatBody, reservedKeysPresent } from "./lib/limits.mjs";
import { buildSystem, makeCharKeyChecker } from "./lib/personas.mjs";
import {
  checkGlobalLimit,
  checkGlobalTtsLimit,
  checkIpLimit,
  clientIp,
  hashIp,
  recordGlobalSession,
  recordTtsSuccess,
} from "./lib/ratelimit.mjs";
import { isOriginAllowed } from "./lib/origin.mjs";
import { loadPersistedState, loadTtsState, savePersistedState, saveTtsState } from "./lib/state.mjs";
import { callUpstream } from "./lib/upstream.mjs";
import { callTtsUpstream, hasTtsVoice, parseTtsBody, reservedTtsKeysPresent, TTS_VOICES } from "./lib/tts.mjs";
import { createLogger } from "./lib/logger.mjs";

/** 请求体硬上限。与 spec §4.1 的错误码表一致（超过 → 413）。两条路径共用。 */
export const MAX_BODY_BYTES = 32 * 1024;

/** 读 body 的总时长上限。挡住"连上来发一半就不动了"的连接。 */
const BODY_READ_TIMEOUT_MS = 10_000;

/**
 * 内存里最多保留多少个 IP 记录。超过就做一次清理。
 * 不设上限的话，被大量不同 IP 打过来时 Map 会无界增长 —— 那是一条内存耗尽的路径。
 *
 * 对话与 TTS **各有各的表**（限额相互独立），所以这个上限对两张表分别生效。
 */
const MAX_IP_RECORDS = 10_000;

/**
 * 从磁盘装载 persona。**单个文件坏掉不拖垮启动** —— 宁可少一个角色（那个 charKey
 * 会走 400 → 前端降级为台词库），也不要整个服务起不来。
 *
 * @param {string} dir
 * @returns {Map<string, { charKey: string, name: string, systemPrompt: string }>}
 */
function loadPersonas(dir) {
  /** @type {Map<string, { charKey: string, name: string, systemPrompt: string }>} */
  const table = new Map();
  /** @type {string[]} */
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return table;
  }
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    try {
      const parsed = JSON.parse(readFileSync(join(dir, name), "utf8"));
      if (typeof parsed?.charKey !== "string" || typeof parsed?.universalPrompt !== "string") continue;
      table.set(parsed.charKey, {
        charKey: parsed.charKey,
        name: typeof parsed.name === "string" ? parsed.name : parsed.charKey,
        systemPrompt: buildSystem(parsed),
      });
    } catch {
      // 故意吞掉：一个角色的 JSON 写坏了，不该让另外两个也用不了。
    }
  }
  return table;
}

/**
 * 读请求体，超过 `MAX_BODY_BYTES` 立即停止并报 `too_large`。
 *
 * 超限时先写完 413 响应再断开连接 —— 顺序反了的话客户端看到的是
 * "连接被重置"而不是 413，排查时会被误判成网络问题。
 *
 * @param {import("node:http").IncomingMessage} req
 * @returns {Promise<{ ok: true, text: string } | { ok: false, reason: "too_large" | "read_error" | "timeout" }>}
 */
function readBody(req) {
  return new Promise((resolve) => {
    /** @type {Buffer[]} */
    const chunks = [];
    let size = 0;
    let settled = false;
    /** @param {{ ok: true, text: string } | { ok: false, reason: "too_large" | "read_error" | "timeout" }} result */
    const done = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => done({ ok: false, reason: "timeout" }), BODY_READ_TIMEOUT_MS);

    // 有 Content-Length 时先按头部判断，省掉"读一半才发现超"的步骤。
    const declared = Number(req.headers["content-length"]);
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      done({ ok: false, reason: "too_large" });
      return;
    }

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        done({ ok: false, reason: "too_large" });
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => done({ ok: true, text: Buffer.concat(chunks).toString("utf8") }));
    req.on("error", () => done({ ok: false, reason: "read_error" }));
  });
}

/**
 * 统一的错误响应。`ok:false` + `error.code` —— 前端只看 HTTP 状态码，
 * 这里多出来的结构是给运维和调试看的。
 *
 * @param {import("node:http").ServerResponse} res
 * @param {number} status
 * @param {string} code
 * @param {string} [reason] 仅 429 使用（`ip_rate` / `ip_daily` / `circuit_open` / `tts_daily`）
 */
function sendError(res, status, code, reason) {
  const body = JSON.stringify({ ok: false, error: reason ? { code, reason } : { code } });
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(body);
}

/**
 * 清理过期的 IP 记录：窗口已过期**且**日计数不是今天的，才可以丢。
 * 只清窗口不看日计数会漏掉"今天已经刷满但窗口刚过期"的记录 —— 那正是最该留着的。
 *
 * @param {Map<string, import("./lib/ratelimit.mjs").IpRecord>} records
 * @param {number} now
 */
function pruneIpRecords(records, now) {
  const today = new Date(now);
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  for (const [ipHash, record] of records) {
    if (record.day !== key && now - record.windowStart > 3600_000) records.delete(ipHash);
  }
}

/**
 * 构造 HTTP 请求处理器。
 *
 * 依赖全部**注入**而不是从模块顶层读：`config` / `personas` / `log` 由入口给，
 * `fetchImpl` 由测试给（换成计数 stub）。这样"六道闸的顺序"与"拒绝路径不调上游"
 * 这两件事都能在进程内被断言，而不必真的起服务、真的连外网。
 *
 * @param {{
 *   config: import("./lib/config.mjs").ServerConfig,
 *   personas: Map<string, { charKey: string, name: string, systemPrompt: string }>,
 *   log: ReturnType<typeof createLogger>,
 *   fetchImpl?: typeof fetch,
 *   persisted?: import("./lib/state.mjs").PersistedState,
 *   ttsState?: import("./lib/state.mjs").TtsPersistedState,
 * }} deps
 * @returns {(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => Promise<void>}
 */
export function createRequestHandler(deps) {
  const { config, personas, log, fetchImpl = fetch } = deps;
  const isKnownCharKey = makeCharKeyChecker(personas);

  /** 对话侧的同 IP 记录表。 */
  const ipRecords = new Map();
  /** TTS 侧的 IP 记录表 —— **必须分开**，否则两条链路会互相吃掉对方的额度。 */
  const ttsIpRecords = new Map();

  let persisted = deps.persisted ?? loadPersistedState(config.stateDir);
  let ttsState = deps.ttsState ?? loadTtsState(config.stateDir);
  let stateWritable = true;
  let ttsStateWritable = true;

  /**
   * @param {import("node:http").IncomingMessage} req
   * @param {import("node:http").ServerResponse} res
   */
  async function handleChat(req, res) {
    const started = Date.now();
    const ip = clientIp(req.headers["x-forwarded-for"], req.socket.remoteAddress);
    const ipHash = hashIp(ip, config.ipSalt);
    /** @param {string} code @param {number} status @param {string} [reason] */
    const finish = (code, status, reason) => {
      log.request({
        ipHash,
        charKey: null,
        status,
        degradedReason: code,
        durationMs: Date.now() - started,
      });
      sendError(res, status, code, reason);
    };

    // ---- 闸 0：方法 ----
    if (req.method !== "POST") {
      finish("method_not_allowed", 405);
      return;
    }

    // ---- 闸 6：出口 Origin（先于读 body，省掉为非法来源解析请求的功夫）----
    if (!isOriginAllowed(req.headers.origin, config.allowedOrigins)) {
      finish("forbidden_origin", 403);
      return;
    }

    // ---- 闸 1 前半：体积 ----
    const body = await readBody(req);
    if (!body.ok) {
      if (body.reason === "too_large") {
        finish("payload_too_large", 413);
        return;
      }
      finish("bad_request", 400);
      return;
    }

    let raw;
    try {
      raw = JSON.parse(body.text);
    } catch {
      finish("bad_request", 400);
      return;
    }

    // ---- 闸 1 后半：结构与白名单。到这里的任何拒绝都发生在计费之前 ----
    const parsed = parseChatBody(raw, config, isKnownCharKey);
    if (!parsed.ok) {
      log.alert("reject_shape");
      finish("bad_request", 400);
      return;
    }
    const { charKey, messages } = parsed.value;

    // 夹带保留字段**不拒绝**，只记一笔（防探测：拒绝等于告诉对方白名单长什么样）。
    const reserved = reservedKeysPresent(raw);
    if (reserved.length > 0) log.alert("reserved_keys_ignored", { count: reserved.length });

    // ---- 闸 4：同 IP 限额（每次通过校验的请求都算，含上游失败）----
    const now = Date.now();
    const ipCheck = checkIpLimit(ipRecords.get(ipHash), now, {
      windowMax: config.ipWindowMax,
      windowSec: config.ipWindowSec,
      dailyMax: config.ipDailyMax,
    });
    if (ipCheck.allowed) {
      ipRecords.set(ipHash, ipCheck.next);
      if (ipRecords.size > MAX_IP_RECORDS) pruneIpRecords(ipRecords, now);
    } else {
      log.request({ ipHash, charKey, turns: messages.length, status: 429, degradedReason: ipCheck.reason, durationMs: Date.now() - started });
      sendError(res, 429, "rate_limited", ipCheck.reason ?? "ip_rate");
      return;
    }

    // ---- 闸 5：全局日熔断（只读判定；递增在上游成功之后）----
    const globalCheck = checkGlobalLimit(persisted, now, config.dailySessionMax);
    if (!globalCheck.allowed) {
      log.alert("circuit_open", { sessions: globalCheck.sessions });
      log.request({ ipHash, charKey, turns: messages.length, status: 429, degradedReason: "circuit_open", durationMs: Date.now() - started });
      sendError(res, 429, "rate_limited", "circuit_open");
      return;
    }

    // ---- 关停开关：放在限额之后、上游之前。前端对此一无所知，照常降级 ----
    if (!config.enabled) {
      log.request({ ipHash, charKey, turns: messages.length, status: 503, degradedReason: "disabled", durationMs: Date.now() - started });
      sendError(res, 503, "disabled");
      return;
    }

    // ---- 闸 3 + 上游 ----
    const persona = personas.get(charKey);
    const result = await callUpstream(config, persona?.systemPrompt ?? "", messages, fetchImpl);
    if (!result.ok) {
      log.alert("upstream_failed", { reason: result.reason, status: result.status ?? 0 });
      log.request({ ipHash, charKey, turns: messages.length, status: 502, degradedReason: result.reason, durationMs: Date.now() - started });
      // 上游的原始错误文本到此为止 —— 响应里只有代码。
      sendError(res, 502, "upstream_error");
      return;
    }

    // ---- 成功：到这里才算一次"会话"，才计熔断 ----
    persisted = recordGlobalSession(persisted, now);
    if (stateWritable) {
      const saved = savePersistedState(config.stateDir, persisted);
      if (!saved.ok) {
        stateWritable = false;
        log.alert("state_unwritable", { reason: saved.error.slice(0, 120) });
      }
    }

    const payload = JSON.stringify({ ok: true, reply: result.reply, turns: messages.length });
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-length": Buffer.byteLength(payload),
      "cache-control": "no-store",
    });
    res.end(payload);
    log.request({
      ipHash,
      charKey,
      turns: messages.length,
      status: 200,
      degradedReason: result.truncated ? "upstream_truncated" : null,
      durationMs: Date.now() - started,
    });
  }

  /**
   * `POST /api/tts` —— 语音合成。
   *
   * 与 `handleChat` **并列而独立**：各自的限额、超时、响应形态、计费口径全都不同。
   * 硬塞进一条路径会让"所有拒绝都在计费之前"这条纪律难以核验，
   * 而在 TTS 这里验错一次就是按字符计费的真金白银。
   *
   * @param {import("node:http").IncomingMessage} req
   * @param {import("node:http").ServerResponse} res
   */
  async function handleTts(req, res) {
    const started = Date.now();
    const ip = clientIp(req.headers["x-forwarded-for"], req.socket.remoteAddress);
    const ipHash = hashIp(ip, config.ipSalt);

    /**
     * 统一的拒绝出口：先记一行 TTS 日志，再回错误体。
     * `args.reason` 只在 429 上有值（`ip_rate` / `ip_daily` / `tts_daily`）。
     *
     * @param {string} code
     * @param {number} status
     * @param {{ reason?: string, charKey?: string | null, chars?: number }} [args]
     */
    const reject = (code, status, args = {}) => {
      log.tts({
        ipHash,
        charKey: args.charKey ?? null,
        chars: args.chars ?? 0,
        status,
        degradedReason: args.reason ?? code,
        durationMs: Date.now() - started,
      });
      sendError(res, status, code, args.reason);
    };

    // ---- 闸 0：方法 ----
    if (req.method !== "POST") {
      reject("method_not_allowed", 405);
      return;
    }

    // ---- 闸 6：出口 Origin（先于读 body）----
    if (!isOriginAllowed(req.headers.origin, config.allowedOrigins)) {
      reject("forbidden_origin", 403);
      return;
    }

    // ---- 闸 1 前半：体积 ----
    const body = await readBody(req);
    if (!body.ok) {
      if (body.reason === "too_large") {
        reject("payload_too_large", 413);
        return;
      }
      reject("bad_request", 400);
      return;
    }

    let raw;
    try {
      raw = JSON.parse(body.text);
    } catch {
      reject("bad_request", 400);
      return;
    }

    // ---- 闸 1 后半：结构与白名单。到这里的任何拒绝都发生在计费之前 ----
    const parsed = parseTtsBody(raw, { maxChars: config.ttsMaxChars }, hasTtsVoice);
    if (!parsed.ok) {
      // `no_voice` 不是"多带了字段"，而是这个请求没有可执行的语义（没音色可合成）。
      if (parsed.code === "no_voice") {
        reject("no_voice", 404);
        return;
      }
      log.alert("reject_shape");
      reject("bad_request", 400);
      return;
    }
    const { charKey, text } = parsed.value;
    const chars = text.length;

    const reserved = reservedTtsKeysPresent(raw);
    if (reserved.length > 0) log.alert("reserved_keys_ignored", { count: reserved.length });

    // ---- 闸 4：同 IP 限额（TTS 自己的计数表；每次通过校验的请求都算）----
    const now = Date.now();
    const ipCheck = checkIpLimit(ttsIpRecords.get(ipHash), now, {
      windowMax: config.ttsIpWindowMax,
      windowSec: config.ttsIpWindowSec,
      dailyMax: config.ttsIpDailyMax,
    });
    if (ipCheck.allowed) {
      ttsIpRecords.set(ipHash, ipCheck.next);
      if (ttsIpRecords.size > MAX_IP_RECORDS) pruneIpRecords(ttsIpRecords, now);
    } else {
      reject("rate_limited", 429, { reason: ipCheck.reason ?? "ip_rate", charKey, chars });
      return;
    }

    // ---- 闸 5：全局日熔断（只读判定；递增在上游成功之后）----
    const globalCheck = checkGlobalTtsLimit(ttsState, now, config.ttsDailyMax);
    if (!globalCheck.allowed) {
      log.alert("tts_circuit_open", { requests: globalCheck.requests });
      reject("rate_limited", 429, { reason: "tts_daily", charKey, chars });
      return;
    }

    // ---- 关停：TTS 有**独立于对话**的开关；且缺 `TTS_MODEL` 时同样判为不可用 ——
    // 两种来源都走 503（可见地关着），而不是回落到某个猜出来的模型名。
    if (!config.ttsEnabled || !config.ttsModel) {
      reject("disabled", 503, { charKey, chars });
      return;
    }

    // ---- 闸 3 + 上游 ----
    const voice = TTS_VOICES[/** @type {keyof typeof TTS_VOICES} */ (charKey)];
    const result = await callTtsUpstream(config, voice, text, fetchImpl);
    if (!result.ok) {
      log.alert("upstream_failed", { reason: result.reason, status: result.status ?? 0 });
      reject("upstream_error", 502, { reason: result.reason, charKey, chars });
      return;
    }

    // ---- 成功：到这里才算一次合成，才计熔断与字符账本 ----
    ttsState = recordTtsSuccess(ttsState, now, result.usageCharacters);
    if (ttsStateWritable) {
      const saved = saveTtsState(config.stateDir, ttsState);
      if (!saved.ok) {
        ttsStateWritable = false;
        log.alert("state_unwritable", { reason: saved.error.slice(0, 120) });
      }
    }

    // 原样回 mp3 字节。**不做响应压缩**（mp3 已压缩，再压无收益还可能更慢）。
    // `private, no-store` 是明示不缓存，与「刷新即清」的口径一致。
    res.writeHead(200, {
      "content-type": "audio/mpeg",
      "content-length": result.audio.length,
      "cache-control": "private, no-store",
    });
    res.end(result.audio);
    log.tts({ ipHash, charKey, chars, status: 200, degradedReason: null, durationMs: Date.now() - started });
  }

  return async function handler(req, res) {
    const url = new URL(req.url ?? "/", "http://localhost");

    // ---- 健康检查：不鉴权、不暴露配置，供部署校验与临时容器干跑使用 ----
    if (url.pathname === "/api/health") {
      const body = JSON.stringify({ ok: true, enabled: config.enabled });
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(body),
        "cache-control": "no-store",
      });
      res.end(body);
      return;
    }

    if (url.pathname === "/api/chat") {
      await handleChat(req, res);
      return;
    }

    if (url.pathname === "/api/tts") {
      await handleTts(req, res);
      return;
    }

    sendError(res, 404, "not_found");
  };
}

export async function main() {
  const { config, errors } = loadConfig(process.env);
  if (errors.length > 0) {
    // 配置错误必须**吵着退出**：静默用默认值跑起来的话，限额可能形同不存在。
    for (const e of errors) process.stderr.write(`[chat] 配置错误：${e}\n`);
    process.exit(1);
  }

  const log = createLogger();
  const personas = loadPersonas(join(import.meta.dirname, "personas"));

  if (personas.size === 0) {
    // 不是致命错误：服务能起、会响应 /api/health，只是所有对话都 400 → 前端降级。
    // 这样部署时的"容器起没起来"与"persona 生成了没"是两个独立可观测的事实。
    log.alert("personas_empty", { dir: join(import.meta.dirname, "personas") });
  }

  if (!config.enabled) log.alert("chat_disabled");
  // TTS 不可用的两种来源各自记一条 —— 都让 /api/tts 回 503，功能**可见地关着**。
  if (!config.ttsEnabled) log.alert("tts_disabled");
  else if (!config.ttsModel) log.alert("tts_model_missing");

  const persisted = loadPersistedState(config.stateDir);
  const ttsState = loadTtsState(config.stateDir);
  const handler = createRequestHandler({ config, personas, log, persisted, ttsState });
  const server = createServer(handler);

  server.listen(config.port, "0.0.0.0", () => {
    log.alert("listening", {
      port: config.port,
      personas: personas.size,
      enabled: config.enabled,
      tts: config.ttsEnabled && Boolean(config.ttsModel),
      sessions: persisted.sessions,
      ttsRequests: ttsState.requests,
    });
  });

  // docker stop 走 SIGTERM：先停止接收新连接，再退出。不处理的话
  // 正在处理的请求会被直接砍掉，前端拿到网络错误（虽然也会降级，但日志会难看）。
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return server;
}

// 只有直接运行本文件时才起服务；被 import（测试）时不自动启动。
//
// 用 `pathToFileURL` 而不是手拼 `file://` —— Windows 上盘符路径拼出来是
// `file://G:/...`，而 `import.meta.url` 是 `file:///G:/...`（三个斜杠），
// 手拼会永远不相等，症状是"直接运行什么都不发生、进程静默退出"。
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`[chat] 启动失败：${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
