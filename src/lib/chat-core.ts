/**
 * chat-001 —— 网页端 SoulPod 对话的**纯逻辑层**。
 *
 * 刻意的约束：本文件**不碰 DOM、不碰 i18n、不发请求**。原因有三 ——
 *   1. 它是 `backend-001`（vitest）最自然的测试目标，纯函数才测得动；
 *   2. 上限口径只有一处定义，前端裁剪与文档不会各说一套；
 *   3. 对话抽屉是懒加载 chunk，这里越干净，chunk 越小。
 *
 * 权威在服务端（见 `harness/docs/spec-chat-server.md`）：本文件的裁剪只是"省流量 + 好体验"，
 * **服务端不信前端传的任何东西**，会再裁一遍。前端不做任何安全假设。
 */

export type ChatRole = "user" | "assistant";

/** 一条会话内消息（带本地 id，仅用于 React key）。 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

/** 发给服务端的消息（无 id）。 */
export interface ChatTurn {
  role: ChatRole;
  content: string;
}

/**
 * 客户端侧的上限（软约束）。
 * 与 `spec-chat-server.md` 的环境变量默认值一致，但**服务端才是硬约束** —— 这里改了不会削弱服务端。
 */
export const CHAT_CLIENT_LIMITS = {
  /** 一次会话最多多少轮用户发言（1 轮 = 1 次用户发言）。 */
  maxTurns: 12,
  /** 单条输入上限（字符）。 */
  maxChars: 200,
  /** 发给服务端的历史轮数上限（服务端默认 CHAT_MAX_TURNS=6）。 */
  sendHistoryTurns: 6,
  /** 请求体粗检上限，超过就本地判为"不可用"而不是白跑一次网络。 */
  maxBodyBytes: 32 * 1024,
} as const;

/** 回复降级的原因 —— 决定界面显示哪一句灰字，**不决定行为**（四种走同一条降级路径）。 */
export type ChatDegradeReason = "unavailable" | "quota" | "disabled" | "error";

export interface ChatReply {
  content: string;
  /** null = 来自模型的真实回复；非 null = 预设台词，界面必须标出来。 */
  degraded: ChatDegradeReason | null;
}

/** 按字符数截断（不做省略号，截断就是截断 —— 服务端也会再截一次）。 */
export function trimToChars(content: string, max: number = CHAT_CLIENT_LIMITS.maxChars): string {
  const normalized = content.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return normalized.length <= max ? normalized : normalized.slice(0, max);
}

/** 已用轮数 = 用户发言条数。 */
export function turnsUsed(messages: readonly ChatMessage[]): number {
  return messages.reduce((n, m) => (m.role === "user" ? n + 1 : n), 0);
}

/** 是否还能继续发（达到上限后前端不再请求，改为引导下载 SoulPod）。 */
export function canSendMore(messages: readonly ChatMessage[], maxTurns: number = CHAT_CLIENT_LIMITS.maxTurns): boolean {
  return turnsUsed(messages) < maxTurns;
}

/**
 * 取最近 N 轮送给服务端：从尾部往上数 N 条**用户发言**，连同其后的回复一起保留。
 * 比"取最后 2N 条"更稳 —— 那条规则在出现连续两条同角色消息（例如出错重试）时会切掉不该切的上下文。
 */
export function toApiTurns(
  messages: readonly ChatMessage[],
  maxTurns: number = CHAT_CLIENT_LIMITS.sendHistoryTurns,
): ChatTurn[] {
  if (maxTurns <= 0) return [];
  let seen = 0;
  let start = 0;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") {
      seen += 1;
      if (seen === maxTurns) {
        start = i;
        break;
      }
    }
  }
  return messages.slice(start).map((m) => ({
    role: m.role,
    content: trimToChars(m.content),
  }));
}

/**
 * 构造请求体。**这里就是"客户端永不传 system prompt"这条约束的客户端一侧** ——
 * 只有 `charKey` 与 `messages`，没有 system / model / max_tokens / temperature。
 */
export function buildChatRequest(
  charKey: string,
  messages: readonly ChatMessage[],
  maxTurns: number = CHAT_CLIENT_LIMITS.sendHistoryTurns,
): { charKey: string; messages: ChatTurn[] } {
  return { charKey, messages: toApiTurns(messages, maxTurns) };
}

export type ChatResponseVerdict =
  | { ok: true; reply: string }
  | { ok: false; reason: ChatDegradeReason };

/**
 * 判定一次 `/api/chat` 响应能不能用。
 *
 * **为什么要单独判 `content-type`**：静态站点（vite dev / nginx `try_files`）在路径没匹配上时
 * 常常返回 `index.html` + **HTTP 200**。只看状态码会把一整页 HTML 当成回复贴进对话里。
 * 本项目在素材校验上踩过同一个坑（见 handover「Vite dev server 的 SPA fallback 会造成假阳性」）。
 */
export function interpretChatResponse(input: {
  status: number;
  contentType: string | null;
  bodyText: string;
}): ChatResponseVerdict {
  const { status, contentType, bodyText } = input;

  if (status === 429) return { ok: false, reason: "quota" };
  if (status === 403 || status === 404 || status === 405) return { ok: false, reason: "unavailable" };
  if (status === 503) return { ok: false, reason: "disabled" };
  if (status < 200 || status >= 300) return { ok: false, reason: "error" };

  const isJson = (contentType ?? "").toLowerCase().includes("application/json");
  if (!isJson) return { ok: false, reason: "unavailable" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return { ok: false, reason: "error" };
  }

  if (typeof parsed !== "object" || parsed === null) return { ok: false, reason: "error" };
  const obj = parsed as Record<string, unknown>;
  if (obj.ok !== true) return { ok: false, reason: "error" };
  const reply = typeof obj.reply === "string" ? obj.reply.trim() : "";
  if (!reply) return { ok: false, reason: "error" };

  return { ok: true, reply };
}

/** 降级台词库的一条规则：命中任一关键词就用这组回复。 */
export interface ChatFallbackRule {
  keywords: readonly string[];
  replies: readonly string[];
}

/**
 * 从台词库挑一句。
 *
 * `seed` 只用来自增轮换（同一句话问两次不会得到同一句答复），
 * 所以这个函数是**确定性**的：同样的 (规则, 输入, seed) 永远给同一句 —— 便于单测与 E2E 断言。
 */
export function pickFallbackReply(
  rules: readonly ChatFallbackRule[],
  defaultReplies: readonly string[],
  userText: string,
  seed: number,
): string {
  const text = userText.toLowerCase();
  const matched = rules.filter((r) =>
    r.keywords.some((k) => text.includes(k.toLowerCase())),
  );
  const pool: readonly string[] =
    matched.length > 0 ? matched.flatMap((r) => r.replies) : defaultReplies;
  if (pool.length === 0) return "";
  const idx = ((seed % pool.length) + pool.length) % pool.length;
  return pool[idx];
}
