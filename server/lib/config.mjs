// @ts-check
/**
 * 服务端配置：**唯一**读 `process.env` 的地方。
 *
 * 为什么集中在一处：其余模块一律接收 config 对象作参数 —— 测试就能构造任意配置，
 * 不必去改进程环境（改 `process.env` 的测试会互相污染，且顺序一变就不可复现）。
 *
 * 为什么这里不抛异常、只返回 `errors`：本模块会被测试 import，库模块里出现
 * `process.exit` 就意味着「任何一次 import 都可能杀掉测试进程」。是否退出由入口决定。
 */

/**
 * 缺省值必须与 `harness/docs/spec-chat-server.md` §8 逐条一致。
 * 改这里就得同时改那份文档 —— 两边不一致时，运维会按文档配、按代码跑，最难查。
 */
export const DEFAULTS = {
  CHAT_ENABLED: true,
  CHAT_PORT: 8787,
  CHAT_ALLOWED_ORIGINS: "https://www.traceinhabit.cn,https://traceinhabit.cn",
  CHAT_MAX_CHARS: 200,
  CHAT_MAX_TURNS: 6,
  CHAT_MAX_INPUT_CHARS: 12000,
  CHAT_MAX_TOKENS: 200,
  CHAT_TEMPERATURE: 0.7,
  CHAT_IP_WINDOW_MAX: 15,
  CHAT_IP_WINDOW_SEC: 300,
  CHAT_IP_DAILY_MAX: 60,
  CHAT_DAILY_SESSION_MAX: 150,
  CHAT_UPSTREAM_TIMEOUT_MS: 20000,
  CHAT_STATE_DIR: "/app/state",
  MINIMAX_API_BASE: "https://api.minimaxi.com/v1",

  // ---- chat-003：语音合成（TTS）。与对话**完全独立**的一组开关与限额 ----
  //
  // 为什么独立：TTS 按**字符**计费、对话按 token 计费，两者的成本曲线与故障形态
  // 都不一样。紧急时可能需要「保住对话、先关语音」（或反之），共用一个开关会让
  // 这个选择变得不可能。
  TTS_ENABLED: true,
  TTS_MAX_CHARS: 200,
  TTS_IP_WINDOW_MAX: 10,
  TTS_IP_WINDOW_SEC: 300,
  TTS_IP_DAILY_MAX: 60,
  TTS_DAILY_MAX: 300,
  // 比对话的 20000 更长：合成音频比生成文本慢。
  TTS_UPSTREAM_TIMEOUT_MS: 30000,
  // 注意 `TTS_MODEL` 不在这里 —— 它是必填项，但**不是致命配置**，见 REQUIRED_KEYS 的注释。
};

/**
 * 必填项。缺一个就不启动 —— 这三个都是「缺了会静默地用错东西」的类型：
 * 没 Key 会 401、没模型名会猜一个、没盐会让 IP 哈希可被彩虹表还原。
 *
 * `TTS_MODEL` **刻意不在这里**：它不属于上面那一类。缺了它不会"用错东西"，
 * 只会"干不了这件事"。而放进这个列表的代价是 —— 一次普通的镜像升级若忘了补
 * 新变量，会连**对话**一起打不起来。用可用性换一句更早的报错不划算。
 *
 * 因此 `loadConfig` 只把它读成空串；由入口记一条 `tts_model_missing` 告警、
 * 由 `/api/tts` 回 `503 disabled`。**功能可见地关着，不是静默降级** ——
 * 这与本文件"不许静默用默认值跑起来"的初衷一致。
 */
export const REQUIRED_KEYS = ["MINIMAX_API_KEY", "MINIMAX_MODEL", "CHAT_IP_SALT"];

/**
 * 读一个正整数。**不静默回落** —— 配错了却照常运行，是最难发现的故障形态：
 * 表面在跑，实际限额全错。宁可启动时报出来。
 *
 * @param {Record<string, string | undefined>} env
 * @param {string} name
 * @param {number} fallback
 * @param {string[]} errors
 * @returns {number}
 */
export function readInt(env, name, fallback, errors) {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    errors.push(`${name} 必须是正整数，实际收到 ${JSON.stringify(raw)}`);
    return fallback;
  }
  return n;
}

/**
 * 读一个非负数（小数允许）。用于 temperature 这类可以是 0 或小数的字段。
 *
 * @param {Record<string, string | undefined>} env
 * @param {string} name
 * @param {number} fallback
 * @param {string[]} errors
 * @param {number} [max]
 * @returns {number}
 */
export function readNumber(env, name, fallback, errors, max) {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || (max !== undefined && n > max)) {
    errors.push(`${name} 必须是不超过 ${max ?? "∞"} 的非负数，实际收到 ${JSON.stringify(raw)}`);
    return fallback;
  }
  return n;
}

/**
 * 读布尔。**只有显式写 `false` / `0` 才算关** —— 这条是有意的：
 * `CHAT_ENABLED` 是应急关停开关，其余任何拼写（`no`、`off`、`0x0`）都当成开着，
 * 免得有人以为关掉了、实际上站点还在烧钱。
 *
 * @param {Record<string, string | undefined>} env
 * @param {string} name
 * @param {boolean} fallback
 * @returns {boolean}
 */
export function readBool(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  return !(raw === "false" || raw === "0");
}

/**
 * 解析逗号分隔的 Origin 白名单。空白项丢弃，便于在 `.env` 里换行书写。
 *
 * @param {string} raw
 * @returns {string[]}
 */
export function parseOrigins(raw) {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @typedef {object} ServerConfig
 * @property {boolean} enabled
 * @property {number} port
 * @property {string[]} allowedOrigins
 * @property {number} maxChars          单条输入字符上限
 * @property {number} maxTurns          送上游的历史轮数
 * @property {number} maxInputChars     总输入字符上限
 * @property {number} maxTokens         输出上限
 * @property {number} temperature
 * @property {number} ipWindowMax
 * @property {number} ipWindowSec
 * @property {number} ipDailyMax
 * @property {number} dailySessionMax   全局日熔断
 * @property {number} upstreamTimeoutMs
 * @property {string} stateDir
 * @property {string} apiKey
 * @property {string} apiBase
 * @property {string} model
 * @property {string} ipSalt
 * @property {boolean} ttsEnabled
 * @property {string} ttsModel     空串 = 未配置 → TTS 判为不可用（503），**不影响对话**
 * @property {number} ttsMaxChars  单次合成长度上限（超出截断，与对话同口径）
 * @property {number} ttsIpWindowMax
 * @property {number} ttsIpWindowSec
 * @property {number} ttsIpDailyMax
 * @property {number} ttsDailyMax
 * @property {number} ttsUpstreamTimeoutMs
 */

/**
 * 组装配置。返回 `{ config, errors }`；`errors` 非空时由入口负责退出。
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ config: ServerConfig, errors: string[] }}
 */
export function loadConfig(env = process.env) {
  /** @type {string[]} */
  const errors = [];
  for (const name of REQUIRED_KEYS) {
    if (!env[name]) errors.push(`缺少必填环境变量 ${name}`);
  }

  /** @type {ServerConfig} */
  const config = {
    enabled: readBool(env, "CHAT_ENABLED", DEFAULTS.CHAT_ENABLED),
    port: readInt(env, "CHAT_PORT", DEFAULTS.CHAT_PORT, errors),
    allowedOrigins: parseOrigins(env.CHAT_ALLOWED_ORIGINS || DEFAULTS.CHAT_ALLOWED_ORIGINS),
    maxChars: readInt(env, "CHAT_MAX_CHARS", DEFAULTS.CHAT_MAX_CHARS, errors),
    maxTurns: readInt(env, "CHAT_MAX_TURNS", DEFAULTS.CHAT_MAX_TURNS, errors),
    maxInputChars: readInt(env, "CHAT_MAX_INPUT_CHARS", DEFAULTS.CHAT_MAX_INPUT_CHARS, errors),
    maxTokens: readInt(env, "CHAT_MAX_TOKENS", DEFAULTS.CHAT_MAX_TOKENS, errors),
    temperature: readNumber(env, "CHAT_TEMPERATURE", DEFAULTS.CHAT_TEMPERATURE, errors, 2),
    ipWindowMax: readInt(env, "CHAT_IP_WINDOW_MAX", DEFAULTS.CHAT_IP_WINDOW_MAX, errors),
    ipWindowSec: readInt(env, "CHAT_IP_WINDOW_SEC", DEFAULTS.CHAT_IP_WINDOW_SEC, errors),
    ipDailyMax: readInt(env, "CHAT_IP_DAILY_MAX", DEFAULTS.CHAT_IP_DAILY_MAX, errors),
    dailySessionMax: readInt(env, "CHAT_DAILY_SESSION_MAX", DEFAULTS.CHAT_DAILY_SESSION_MAX, errors),
    upstreamTimeoutMs: readInt(env, "CHAT_UPSTREAM_TIMEOUT_MS", DEFAULTS.CHAT_UPSTREAM_TIMEOUT_MS, errors),
    stateDir: env.CHAT_STATE_DIR || DEFAULTS.CHAT_STATE_DIR,
    apiKey: env.MINIMAX_API_KEY || "",
    apiBase: (env.MINIMAX_API_BASE || DEFAULTS.MINIMAX_API_BASE).replace(/\/+$/, ""),
    model: env.MINIMAX_MODEL || "",
    ipSalt: env.CHAT_IP_SALT || "",
    ttsEnabled: readBool(env, "TTS_ENABLED", DEFAULTS.TTS_ENABLED),
    ttsModel: env.TTS_MODEL || "",
    ttsMaxChars: readInt(env, "TTS_MAX_CHARS", DEFAULTS.TTS_MAX_CHARS, errors),
    ttsIpWindowMax: readInt(env, "TTS_IP_WINDOW_MAX", DEFAULTS.TTS_IP_WINDOW_MAX, errors),
    ttsIpWindowSec: readInt(env, "TTS_IP_WINDOW_SEC", DEFAULTS.TTS_IP_WINDOW_SEC, errors),
    ttsIpDailyMax: readInt(env, "TTS_IP_DAILY_MAX", DEFAULTS.TTS_IP_DAILY_MAX, errors),
    ttsDailyMax: readInt(env, "TTS_DAILY_MAX", DEFAULTS.TTS_DAILY_MAX, errors),
    ttsUpstreamTimeoutMs: readInt(env, "TTS_UPSTREAM_TIMEOUT_MS", DEFAULTS.TTS_UPSTREAM_TIMEOUT_MS, errors),
  };

  // 零容量的限额是配置错误，不是"关掉限流"。显式挡住，否则限额形同不存在。
  if (config.maxTurns < 1) errors.push("CHAT_MAX_TURNS 至少为 1（否则历史全被丢掉）");
  if (config.maxInputChars < config.maxChars) {
    errors.push("CHAT_MAX_INPUT_CHARS 不得小于 CHAT_MAX_CHARS（否则单条合法的消息也会被丢掉）");
  }

  return { config, errors };
}
