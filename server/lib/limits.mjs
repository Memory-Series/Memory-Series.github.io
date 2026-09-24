// @ts-check
/**
 * 闸 1（请求体白名单）+ 闸 2（裁剪）。**全部是纯函数**，是本条被测试最重的一块。
 *
 * 两条设计原则：
 *
 * 1. **服务端不信任前端的任何裁剪**。前端 `src/lib/chat-core.ts` 已经做过同样的事
 *    （单条 200 字、最近 6 轮），但那是为了"界面别卡"和"别浪费额度"，**不是安全边界**。
 *    任何人用 curl 都能绕过前端。所以这里独立再实现一遍，口径与前端一致但代码不共享
 *    （一个 TS 一个 mjs，共享会引入构建耦合，而服务端必须能单独跑）。
 *
 * 2. **"能继续聊"优先于"报错"**。内容层面的问题（太长、条数太多）一律**截断/丢弃后继续**，
 *    只有结构层面的问题（不是对象、role 非法、charKey 未知）才 400。
 *    理由是设计文档 §10.4 的承诺：超限不报错、要有出路。用户不该因为"打得字多了"被拒绝。
 */

/** 请求体顶层**只允许**这两个键 —— 这是「客户端永不传 system prompt」的实现处。 */
export const ALLOWED_TOP_LEVEL_KEYS = ["charKey", "messages"];

/**
 * 允许的 role。`system` 不在这里，**将来也不加** ——
 * 一旦接受客户端传 system，这个接口就变成了免费的通用 LLM 网关，
 * 谁能打开 F12 谁就能白嫖（这正是 `chat-002` 要防的第一件事）。
 */
export const ALLOWED_ROLES = ["user", "assistant"];

/**
 * 消息数组长度硬上限。前端上限是 12 轮 = 最多 24 条；64 留了 2.6 倍余量。
 * 正常前端永远碰不到，设它是为了挡住「一次发 10 万条空消息」这类攻击。
 */
export const MAX_MESSAGES = 64;

/**
 * 归一化并截断到 `maxChars`。
 *
 * 与前端 `trimToChars` 同口径：先把各种换行统一成 `\n`、把连续空行压成一行、再 trim，
 * **最后才截断** —— 顺序反了会出现"截断后又多出换行"的结果，两端算出的长度就对不上。
 *
 * @param {string} text
 * @param {number} maxChars
 * @returns {string}
 */
export function trimToChars(text, maxChars) {
  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalized.length > maxChars ? normalized.slice(0, maxChars) : normalized;
}

/**
 * 只保留最近 `maxTurns` 轮对话，从尾部往前数**用户发言**切分。
 *
 * 为什么不按"取最后 2N 条"：一轮不一定是两条（模型偶尔会连着说两句、或用户连发两条），
 * 按条数切会把某一轮的问题切掉，模型看到的历史就少了一问，回复会接不上。
 * 从尾数 user 发言则保证切出来的第一条一定是用户的话。
 *
 * @param {Array<{ role: string, content: string }>} messages
 * @param {number} maxTurns
 * @returns {Array<{ role: string, content: string }>}
 */
export function pickRecentTurns(messages, maxTurns) {
  let seen = 0;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role !== "user") continue;
    seen += 1;
    if (seen === maxTurns) return messages.slice(i);
  }
  return messages.slice();
}

/**
 * 总输入字符上限：超出时**从最旧的一端丢**，直到落到上限以内。至少保留一条。
 *
 * @param {Array<{ role: string, content: string }>} messages
 * @param {number} maxChars
 * @returns {{ messages: Array<{ role: string, content: string }>, dropped: number }}
 */
export function capTotalChars(messages, maxChars) {
  let total = messages.reduce((n, m) => n + m.content.length, 0);
  let start = 0;
  while (total > maxChars && start < messages.length - 1) {
    total -= messages[start].content.length;
    start += 1;
  }
  return { messages: messages.slice(start), dropped: start };
}

/**
 * @typedef {object} ParsedBody
 * @property {string} charKey
 * @property {Array<{ role: string, content: string }>} messages
 * @property {number} trimmedMessages  因内容不合法被丢弃的条数（仅日志用）
 * @property {number} droppedForSize   因总字符上限被丢弃的条数（仅日志用）
 */

/**
 * 解析并校验请求体。
 *
 * 返回 `{ ok: true, value }` 或 `{ ok: false, reason }`。
 * `reason` 是**给日志看的**内部细节，响应体里只有笼统的 `bad_request` ——
 * 把「哪一条规则挂了」告诉调用方，等于给他一份白名单探测地图。
 *
 * @param {unknown} raw
 * @param {{ maxChars: number, maxTurns: number, maxInputChars: number }} opts
 * @param {(key: string) => boolean} isKnownCharKey 由调用方注入，避免本模块依赖 persona 目录
 * @returns {{ ok: true, value: ParsedBody } | { ok: false, reason: string }}
 */
export function parseChatBody(raw, opts, isKnownCharKey) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "body 不是 JSON 对象" };
  }

  const body = /** @type {Record<string, unknown>} */ (raw);
  const charKey = body.charKey;
  if (typeof charKey !== "string" || !isKnownCharKey(charKey)) {
    return { ok: false, reason: "charKey 未知或不是字符串" };
  }

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return { ok: false, reason: "messages 不是非空数组" };
  }
  if (rawMessages.length > MAX_MESSAGES) {
    return { ok: false, reason: `messages 条数超过 ${MAX_MESSAGES}` };
  }

  /** @type {Array<{ role: string, content: string }>} */
  const kept = [];
  let trimmedMessages = 0;

  for (const item of rawMessages) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      trimmedMessages += 1;
      continue;
    }
    const msg = /** @type {Record<string, unknown>} */ (item);
    const role = msg.role;
    // role 非法是**结构性**错误（`role: "system"` 必须被挡在这里），不是内容问题。
    if (typeof role !== "string" || !ALLOWED_ROLES.includes(role)) {
      return { ok: false, reason: `role 不在白名单：${JSON.stringify(role)}` };
    }
    if (typeof msg.content !== "string") {
      trimmedMessages += 1;
      continue;
    }
    const content = trimToChars(msg.content, opts.maxChars);
    if (content === "") {
      trimmedMessages += 1;
      continue;
    }
    kept.push({ role, content });
  }

  if (kept.length === 0) {
    return { ok: false, reason: "messages 里没有一条合法内容" };
  }

  const recent = pickRecentTurns(kept, opts.maxTurns);
  const capped = capTotalChars(recent, opts.maxInputChars);
  if (capped.messages.length === 0) {
    return { ok: false, reason: "裁剪后没有剩余消息" };
  }

  return {
    ok: true,
    value: {
      charKey,
      messages: capped.messages,
      trimmedMessages,
      droppedForSize: capped.dropped,
    },
  };
}

/**
 * 顶层是否出现了被保留的字段。**不用于拒绝**，只用于日志告警 ——
 * 按 `spec-chat-server.md` §5 约束 2 与 `chat-002` 验收：夹带这些字段
 * 必须"被忽略且返回结果与不夹带时逐字相同"，而不是报错。
 * 报错等于告诉探测者"白名单里有什么"，忽略则什么信息都不给。
 *
 * @param {unknown} raw
 * @returns {string[]} 出现过的保留键（按首次出现顺序）
 */
export function reservedKeysPresent(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.keys(raw).filter((k) => !ALLOWED_TOP_LEVEL_KEYS.includes(k));
}
