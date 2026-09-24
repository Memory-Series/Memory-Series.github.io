import { describe, expect, it } from "vitest";

import {
  CHAT_CLIENT_LIMITS,
  buildChatRequest,
  canSendMore,
  interpretChatResponse,
  pickFallbackReply,
  toApiTurns,
  trimToChars,
  turnsUsed,
  type ChatMessage,
} from "@/lib/chat-core";

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

let seq = 0;

/** 造一条会话内消息。`id` 只服务于 React key，这里给个递增值就够了。 */
function msg(role: ChatMessage["role"], content: string): ChatMessage {
  seq += 1;
  return { id: `m${seq}`, role, content };
}

const user = (content: string) => msg("user", content);
const bot = (content: string) => msg("assistant", content);

/** 造一个响应判定入参。传字符串就当原始 body，传对象就序列化。 */
function res(
  body: unknown,
  status = 200,
  contentType: string | null = "application/json",
): { status: number; contentType: string | null; bodyText: string } {
  return {
    status,
    contentType,
    bodyText: typeof body === "string" ? body : JSON.stringify(body),
  };
}

/* ------------------------------------------------------------------ */
/* trimToChars                                                        */
/* ------------------------------------------------------------------ */

describe("trimToChars", () => {
  it("去掉首尾空白", () => {
    expect(trimToChars("  hi  ")).toBe("hi");
    expect(trimToChars("\n\nhi\n\n")).toBe("hi");
  });

  it("CRLF 与孤立的 CR 都归一化成 LF", () => {
    expect(trimToChars("a\r\nb")).toBe("a\nb");
    expect(trimToChars("a\rb")).toBe("a\nb");
  });

  it("三行以上连续空行压成一行空行（两行不动）", () => {
    expect(trimToChars("a\n\nb")).toBe("a\n\nb");
    expect(trimToChars("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("恰好等于上限时不截断", () => {
    const exact = "x".repeat(CHAT_CLIENT_LIMITS.maxChars);
    expect(trimToChars(exact)).toBe(exact);
  });

  it("超过上限时按字符数截断，且不加省略号", () => {
    const out = trimToChars("x".repeat(CHAT_CLIENT_LIMITS.maxChars + 50));
    expect(out).toHaveLength(CHAT_CLIENT_LIMITS.maxChars);
    expect(out).not.toContain("…");
  });

  it("先归一化再截断 —— 上限量的是归一化之后的长度", () => {
    const padded = `  ${"a".repeat(CHAT_CLIENT_LIMITS.maxChars + 10)}\n\n\n\n`;
    const out = trimToChars(padded);
    expect(out).toHaveLength(CHAT_CLIENT_LIMITS.maxChars);
    expect(out.startsWith("a")).toBe(true);
  });

  it("上限可覆盖", () => {
    expect(trimToChars("abcdef", 3)).toBe("abc");
  });
});

/* ------------------------------------------------------------------ */
/* turnsUsed / canSendMore                                            */
/* ------------------------------------------------------------------ */

describe("turnsUsed / canSendMore", () => {
  it("只数用户发言 —— 助手回复不计入轮数", () => {
    expect(turnsUsed([])).toBe(0);
    expect(turnsUsed([bot("a"), bot("b")])).toBe(0);
    expect(turnsUsed([user("a"), bot("b"), user("c")])).toBe(2);
  });

  it("未达上限可以继续发", () => {
    const under = Array.from({ length: CHAT_CLIENT_LIMITS.maxTurns - 1 }, (_, i) => user(`q${i}`));
    expect(canSendMore(under)).toBe(true);
  });

  it("到达上限即不可再发（界面转为引导下载 SoulPod）", () => {
    const at = Array.from({ length: CHAT_CLIENT_LIMITS.maxTurns }, (_, i) => user(`q${i}`));
    expect(turnsUsed(at)).toBe(CHAT_CLIENT_LIMITS.maxTurns);
    expect(canSendMore(at)).toBe(false);
  });

  it("上限可覆盖", () => {
    const at = Array.from({ length: CHAT_CLIENT_LIMITS.maxTurns }, (_, i) => user(`q${i}`));
    expect(canSendMore(at, CHAT_CLIENT_LIMITS.maxTurns + 1)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* toApiTurns                                                         */
/* ------------------------------------------------------------------ */

describe("toApiTurns", () => {
  it("轮数不足 N 时全给", () => {
    const msgs = [user("u1"), bot("a1"), user("u2"), bot("a2")];
    expect(toApiTurns(msgs, 6).map((t) => t.content)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("从尾部往上数 N 条用户发言，连同其后的回复一起保留", () => {
    const msgs = [user("u1"), bot("a1"), user("u2"), bot("a2"), user("u3"), bot("a3")];
    expect(toApiTurns(msgs, 2).map((t) => t.content)).toEqual(["u2", "a2", "u3", "a3"]);
  });

  it("同一个问题后面跟着多条回复时，问题本身不会被切掉", () => {
    // 这正是这里"数用户发言"而不是"取最后 2N 条"的原因：出错重试会让某一条
    // 用户发言后跟两条助手消息，按条数切会把问题丢掉，只剩两条回复。
    const msgs = [user("u1"), bot("a1"), user("u2"), bot("a2"), bot("a2-retry")];
    expect(toApiTurns(msgs, 1).map((t) => t.content)).toEqual(["u2", "a2", "a2-retry"]);
  });

  it("maxTurns <= 0 返回空数组", () => {
    expect(toApiTurns([user("u1")], 0)).toEqual([]);
    expect(toApiTurns([user("u1")], -1)).toEqual([]);
  });

  it("内容会经过 trimToChars 裁剪", () => {
    const long = "y".repeat(CHAT_CLIENT_LIMITS.maxChars + 100);
    const [only] = toApiTurns([user(long)], 1);
    expect(only.content).toHaveLength(CHAT_CLIENT_LIMITS.maxChars);
  });

  it("只保留 role 与 content 两个字段", () => {
    const [only] = toApiTurns([user("hi")], 1);
    expect(Object.keys(only).sort()).toEqual(["content", "role"]);
  });

  it("不修改传入的数组", () => {
    const msgs = [user("u1"), bot("a1")];
    const snapshot = JSON.stringify(msgs);
    toApiTurns(msgs, 1);
    expect(JSON.stringify(msgs)).toBe(snapshot);
  });
});

/* ------------------------------------------------------------------ */
/* buildChatRequest                                                   */
/* ------------------------------------------------------------------ */

describe("buildChatRequest", () => {
  const msgs = [user("u1"), bot("a1"), user("u2")];

  it("请求体只有 charKey 与 messages", () => {
    expect(Object.keys(buildChatRequest("ye-xiu", msgs)).sort()).toEqual(["charKey", "messages"]);
  });

  it("不含任何 system / 模型 / 密钥字段 —— 客户端永不传 system prompt", () => {
    // 这条断言的意义：接口一旦被 F12 打开，请求体里能看到什么、就能被改成什么。
    // 只要出现 system，这个接口就成了免费的通用 LLM 网关；密钥同理。
    const json = JSON.stringify(buildChatRequest("ye-xiu", msgs));
    for (const forbidden of [
      "system",
      "prompt",
      "model",
      "temperature",
      "max_tokens",
      "maxTokens",
      "stream",
      "apiKey",
      "api_key",
    ]) {
      expect(json).not.toContain(forbidden);
    }
  });

  it("消息里不泄漏本地 id", () => {
    const req = buildChatRequest("ye-xiu", msgs);
    expect(req.messages.every((m) => Object.keys(m).sort().join() === "content,role")).toBe(true);
    expect(JSON.stringify(req)).not.toContain('"id"');
  });

  it("charKey 原样透传 —— 合法性由服务端判断，前端不做安全假设", () => {
    expect(buildChatRequest("who-knows", msgs).charKey).toBe("who-knows");
  });

  it("历史轮数上限由参数控制", () => {
    const many = [user("u1"), bot("a1"), user("u2"), bot("a2"), user("u3"), bot("a3")];
    expect(buildChatRequest("ye-xiu", many, 1).messages.map((m) => m.content)).toEqual(["u3", "a3"]);
  });
});

/* ------------------------------------------------------------------ */
/* interpretChatResponse                                              */
/* ------------------------------------------------------------------ */

describe("interpretChatResponse", () => {
  it("429 → quota（超限不是故障，走同一条降级路径）", () => {
    expect(interpretChatResponse(res({}, 429))).toEqual({ ok: false, reason: "quota" });
  });

  it.each([403, 404, 405])("%i → unavailable", (status) => {
    // 404/405 是"本地没起服务端"时的真实常态；403 是 Origin 被拒 —— 对用户
    // 来说都是"这个功能现在不可用"，不该显示成红色错误。
    expect(interpretChatResponse(res({}, status))).toEqual({ ok: false, reason: "unavailable" });
  });

  it("503 → disabled（服务端主动关闭）", () => {
    expect(interpretChatResponse(res({}, 503))).toEqual({ ok: false, reason: "disabled" });
  });

  it.each([400, 500, 502, 418, 300])("%i → error", (status) => {
    expect(interpretChatResponse(res({}, status))).toEqual({ ok: false, reason: "error" });
  });

  it("状态码 0（请求根本没发出去）→ error", () => {
    expect(interpretChatResponse(res({}, 0)).ok).toBe(false);
  });

  it("SPA fallback：200 + text/html 的整页 HTML 必须判为 unavailable，不能当成回复", () => {
    // 静态站点在路径没匹配上时常常返回 index.html 且是 HTTP 200。
    // 只看状态码会把一整页 HTML 贴进对话里 —— 本项目在素材校验上踩过同一个坑。
    expect(
      interpretChatResponse({
        status: 200,
        contentType: "text/html; charset=utf-8",
        bodyText: "<!DOCTYPE html><html><body>app</body></html>",
      }),
    ).toEqual({ ok: false, reason: "unavailable" });
  });

  it("content-type 缺失时不当成 JSON", () => {
    expect(interpretChatResponse(res({ ok: true, reply: "hi" }, 200, null))).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("content-type 的大小写与 charset 后缀都不影响判定", () => {
    expect(
      interpretChatResponse(res({ ok: true, reply: "hi" }, 200, "Application/JSON; charset=utf-8")),
    ).toEqual({ ok: true, reply: "hi" });
  });

  it("2xx 都算成功，2xx 之外都不算", () => {
    expect(interpretChatResponse(res({ ok: true, reply: "hi" }, 201)).ok).toBe(true);
    expect(interpretChatResponse(res({ ok: true, reply: "hi" }, 299)).ok).toBe(true);
    expect(interpretChatResponse(res({ ok: true, reply: "hi" }, 300)).ok).toBe(false);
  });

  it("body 不是合法 JSON → error", () => {
    expect(interpretChatResponse(res("{not json", 200))).toEqual({ ok: false, reason: "error" });
  });

  it.each([
    ["null", "null"],
    ["数字", "123"],
    ["数组", "[]"],
    ["字符串", '"hi"'],
  ])("JSON 合法但不是对象（%s）→ error", (_label, body) => {
    expect(interpretChatResponse(res(body, 200))).toEqual({ ok: false, reason: "error" });
  });

  it("ok 必须严格是布尔 true", () => {
    expect(interpretChatResponse(res({ ok: "true", reply: "hi" })).ok).toBe(false);
    expect(interpretChatResponse(res({ reply: "hi" })).ok).toBe(false);
  });

  it("reply 缺失 / 非字符串 / 全是空白 → error", () => {
    expect(interpretChatResponse(res({ ok: true })).ok).toBe(false);
    expect(interpretChatResponse(res({ ok: true, reply: 42 })).ok).toBe(false);
    expect(interpretChatResponse(res({ ok: true, reply: "   \n " })).ok).toBe(false);
  });

  it("成功时回复被 trim", () => {
    expect(interpretChatResponse(res({ ok: true, reply: "  hi  " }))).toEqual({ ok: true, reply: "hi" });
  });

  it("额外字段不影响成功判定（服务端可以加 turns 之类的元信息）", () => {
    expect(interpretChatResponse(res({ ok: true, reply: "hi", turns: 3 }))).toEqual({
      ok: true,
      reply: "hi",
    });
  });
});

/* ------------------------------------------------------------------ */
/* pickFallbackReply                                                  */
/* ------------------------------------------------------------------ */

describe("pickFallbackReply", () => {
  const rules = [
    { keywords: ["雨", "rain"], replies: ["下雨了啊", "记得带伞"] },
    { keywords: ["吃"], replies: ["你还没吃饭？", "想吃什么"] },
  ];
  const defaults = ["嗯。", "……", "说点别的。"];

  it("命中关键词就用该组的回复", () => {
    expect(pickFallbackReply(rules, defaults, "外面下雨了", 0)).toBe("下雨了啊");
  });

  it("关键词匹配不区分大小写", () => {
    expect(pickFallbackReply(rules, defaults, "It is RAINING", 0)).toBe("下雨了啊");
  });

  it("未命中任何关键词时用默认回复", () => {
    expect(pickFallbackReply(rules, defaults, "你好", 0)).toBe("嗯。");
  });

  it("seed 在池内轮换 —— 同一句话问两次不会得到同一句", () => {
    expect(pickFallbackReply(rules, defaults, "下雨", 1)).toBe("记得带伞");
    expect(pickFallbackReply(rules, defaults, "下雨", 2)).toBe("下雨了啊"); // 池长 2，绕回第一句
  });

  it("池长超过 seed 时也落在池内", () => {
    expect(pickFallbackReply(rules, defaults, "你好", 5)).toBe("说点别的。");
  });

  it("负 seed 不越界", () => {
    const out = pickFallbackReply(rules, defaults, "下雨", -1);
    expect(["下雨了啊", "记得带伞"]).toContain(out);
  });

  it("命中多条规则时按规则顺序合并池", () => {
    const text = "下雨了，你吃了吗";
    expect(pickFallbackReply(rules, defaults, text, 0)).toBe("下雨了啊");
    expect(pickFallbackReply(rules, defaults, text, 2)).toBe("你还没吃饭？");
  });

  it("池为空时返回空串，由调用方决定怎么回落", () => {
    expect(pickFallbackReply([], [], "hi", 0)).toBe("");
  });

  it("是确定性的：同样入参两次结果一致（便于单测与 E2E 断言）", () => {
    expect(pickFallbackReply(rules, defaults, "下雨", 5)).toBe(
      pickFallbackReply(rules, defaults, "下雨", 5),
    );
  });
});
