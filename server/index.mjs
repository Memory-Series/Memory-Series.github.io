#!/usr/bin/env node
// @ts-check
/**
 * 网页端对话服务（C1 极薄代理）—— 服务端入口。
 *
 * 这个进程的全部职责：把浏览器的 `{charKey, messages}` 变成一次上游调用，
 * 并把六道闸全部挡在上游之前。**它不生成任何内容**，也不持有任何用户数据。
 *
 * 零 npm 依赖（只用 `node:*` 内置模块）。这不是洁癖 —— 容器跑在
 * `--read-only` 根 FS 下、镜像要能长期不重建，任何依赖都会变成"下次更新
 * 得重装一遍"的负担；而这个服务的规模（一条路径、一个上游）也确实不需要框架。
 *
 * 请求处理顺序是**有讲究的**，不是随手排的：
 *   关停 → 出口 → 体积 → 结构 → 限额 → 熔断 → 上游
 * 越便宜的检查越靠前；且**所有拒绝都发生在计费之前**（闸 1 的存在意义）。
 */
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { loadConfig } from "./lib/config.mjs";
import { parseChatBody, reservedKeysPresent } from "./lib/limits.mjs";
import { buildSystem, makeCharKeyChecker } from "./lib/personas.mjs";
import { checkGlobalLimit, checkIpLimit, clientIp, hashIp, recordGlobalSession } from "./lib/ratelimit.mjs";
import { isOriginAllowed } from "./lib/origin.mjs";
import { loadPersistedState, savePersistedState } from "./lib/state.mjs";
import { callUpstream } from "./lib/upstream.mjs";
import { createLogger } from "./lib/logger.mjs";

/** 请求体硬上限。与 spec §4.1 的错误码表一致（超过 → 413）。 */
export const MAX_BODY_BYTES = 32 * 1024;

/** 读 body 的总时长上限。挡住"连上来发一半就不动了"的连接。 */
const BODY_READ_TIMEOUT_MS = 10_000;

/**
 * 内存里最多保留多少个 IP 记录。超过就做一次清理。
 * 不设上限的话，被大量不同 IP 打过来时 Map 会无界增长 —— 那是一条内存耗尽的路径。
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
 * 读请求体，超过 `limit` 立即停止并报 `too_large`。
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
 * @param {string} [reason] 仅 429 使用（`ip_rate` / `ip_daily` / `circuit_open`）
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

export async function main() {
  const { config, errors } = loadConfig(process.env);
  if (errors.length > 0) {
    // 配置错误必须**吵着退出**：静默用默认值跑起来的话，限额可能形同不存在。
    for (const e of errors) process.stderr.write(`[chat] 配置错误：${e}\n`);
    process.exit(1);
  }

  const log = createLogger();
  const personas = loadPersonas(join(import.meta.dirname, "personas"));
  const isKnownCharKey = makeCharKeyChecker(personas);

  if (personas.size === 0) {
    // 不是致命错误：服务能起、会响应 /api/health，只是所有对话都 400 → 前端降级。
    // 这样部署时的"容器起没起来"与"persona 生成了没"是两个独立可观测的事实。
    log.alert("personas_empty", { dir: join(import.meta.dirname, "personas") });
  }

  /** @type {Map<string, import("./lib/ratelimit.mjs").IpRecord>} */
  const ipRecords = new Map();
  let persisted = loadPersistedState(config.stateDir);
  let stateWritable = true;

  if (!config.enabled) log.alert("chat_disabled");

  const server = createServer(async (req, res) => {
    const started = Date.now();
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

    if (url.pathname !== "/api/chat") {
      sendError(res, 404, "not_found");
      return;
    }

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
    const result = await callUpstream(config, persona?.systemPrompt ?? "", messages);
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
  });

  server.listen(config.port, "0.0.0.0", () => {
    log.alert("listening", { port: config.port, personas: personas.size, enabled: config.enabled, sessions: persisted.sessions });
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
