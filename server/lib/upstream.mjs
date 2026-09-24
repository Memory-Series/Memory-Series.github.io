// @ts-check
/**
 * 闸 3（`max_tokens` 固定）+ 上游调用。
 *
 * 三条不能省的规矩：
 *   1. **`model` / `max_tokens` / `temperature` 一律取服务端配置**，请求体里同名字段
 *      在 `limits.parseChatBody` 阶段就已经被丢掉了，根本到不了这里。
 *   2. **上游原始错误绝不转发**。上游的报错文本可能带 Key 片段、账号信息、
 *      内部路由地址 —— 直接透传等于把服务端的底细送到浏览器。
 *   3. **超时必须自己控**。不设超时的话，上游半死不活时连接会一直挂着，
 *      前端的 20s 超时虽然会兜住，但服务端会积压大量悬挂请求。
 */

/**
 * 剥掉 `...` / `...` 思考块。
 *
 * M2-her 本身不产生思考块（它是对话专用模型），这个函数是**防御性**的：
 * 万一上游换成带 thinking 的 M2 系列（或 MiniMax 改了默认行为），
 * 思考内容会混在 `content` 里，直接返回给用户就是"角色开始自言自语解题"。
 * 宁多一层过滤，不要一次线上事故。
 *
 * @param {string} text
 * @returns {string}
 */
export function stripThinking(text) {
  return text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "").trim();
}

/**
 * 剥掉括号包裹的动作描写。
 *
 * **为什么必须有这一层**：尾注里写了「不使用括号、动作描写或旁白」，
 * 但 2026-09-24 线上实测 10 次里 **6 次**仍然带括号（`M2-her` 是角色扮演
 * 专用模型，这类描写是它的强倾向）。换成更严厉的尾注只降到 5/10 ——
 * **提示词压不住，必须在响应出口做确定性兜底**。否则用户会看到
 * 「（叼着烟，敲击键盘）看战术录像带呢。」这种自己不该读到的舞台提示。
 *
 * 只处理**成对**括号，且要求括号内不含换行：
 *   - 半角圆括号在正常台词里极少成对出现，但也一起处理（模型会混用）；
 *   - 不碰【】和 **：那两类偶尔是角色刻意的强调（如「【任务】」），
 *     一律剥掉会改变原意；宁可漏过也不要误伤。
 *   - 剥完可能剩下空串（整条回复全是动作描写）→ 由调用方判为无内容。
 *
 * @param {string} text
 * @returns {string}
 */
export function stripStageDirections(text) {
  return text
    .replace(/[（(][^）)\n]*[）)]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[\s，。、；：]+/, "")
    .trim();
}

/**
 * 从上游响应里取回复文本。结构不对返回 `null`（调用方转成 `upstream_shape`）。
 *
 * `content` 兼容两种形态：字符串（文本模型常态）、内容块数组（多模态形态）。
 *
 * @param {unknown} json
 * @returns {{ reply: string, truncated: boolean } | null}
 */
export function extractReply(json) {
  if (json === null || typeof json !== "object") return null;
  const choices = /** @type {any} */ (json).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const message = choices[0]?.message;
  let content = message?.content;
  if (Array.isArray(content)) {
    content = content
      .filter((/** @type {any} */ part) => part && part.type === "text" && typeof part.text === "string")
      .map((/** @type {any} */ part) => part.text)
      .join("");
  }
  if (typeof content !== "string") return null;

  const reply = stripStageDirections(stripThinking(content)).replace(/\s+$/g, "");
  if (reply === "") return null;

  const finish = choices[0]?.finish_reason;
  return { reply, truncated: finish === "length" };
}

/**
 * 组装上游请求体。
 *
 * 关于长度字段：**两个都发**。MiniMax 的 M2-her 文档写的是 `max_completion_tokens`，
 * 而通用 OpenAI 兼容实现认的是 `max_tokens`；两者取不到交集时，只发一个会有一种
 * 实现**静默忽略**它（不报错、但长度限制失效 → 回复变长、成本上升，最难发现的一类故障）。
 * 发两个的代价是"其中一个被忽略"，这正是我们想要的结果。
 * （若上游对未知字段直接 400，实测时会暴露，改一行即可 —— 见 spec §12 待确认项。）
 *
 * @param {{ model: string, maxTokens: number, temperature: number }} config
 * @param {string} system
 * @param {Array<{ role: string, content: string }>} messages
 * @returns {Record<string, unknown>}
 */
export function buildUpstreamPayload(config, system, messages) {
  return {
    model: config.model,
    messages: [{ role: "system", content: system }, ...messages],
    max_tokens: config.maxTokens,
    max_completion_tokens: config.maxTokens,
    temperature: config.temperature,
    stream: false,
  };
}

/**
 * @typedef {object} UpstreamResult
 * @property {boolean} ok
 * @property {string} [reply]
 * @property {boolean} [truncated]
 * @property {number} [status]
 * @property {string} [reason]  内部原因码，**只进日志，绝不进响应体**
 */

/**
 * 调上游。
 *
 * @param {{ apiBase: string, apiKey: string, model: string, maxTokens: number, temperature: number, upstreamTimeoutMs: number }} config
 * @param {string} system
 * @param {Array<{ role: string, content: string }>} messages
 * @param {typeof fetch} [fetchImpl] 注入点：测试用它换成 stub，一次网络都不打
 * @returns {Promise<UpstreamResult>}
 */
export async function callUpstream(config, system, messages, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.upstreamTimeoutMs);

  try {
    const res = await fetchImpl(`${config.apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(buildUpstreamPayload(config, system, messages)),
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

    const extracted = extractReply(json);
    if (!extracted) return { ok: false, reason: "upstream_shape", status: res.status };

    return { ok: true, reply: extracted.reply, truncated: extracted.truncated, status: res.status };
  } catch (err) {
    const aborted = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
    return { ok: false, reason: aborted ? "upstream_timeout" : "upstream_network" };
  } finally {
    clearTimeout(timer);
  }
}
