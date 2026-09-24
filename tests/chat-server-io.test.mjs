/**
 * `chat-002` —— 上游调用、persona 组装、日志隐私、状态持久化。
 *
 * 上游调用全部走**注入的 stub fetch**，一次网络都不打：
 * 真 Key 不该出现在测试里，而且"上游超时/返回非 JSON/返回 500"这些分支
 * 用真接口根本构造不出来 —— 偏偏它们正是最需要被锁住的部分。
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { CHAR_KEY_BY_NAME, TRAILING_NOTE, buildSystem, makeCharKeyChecker } from "../server/lib/personas.mjs";
import { buildUpstreamPayload, callUpstream, extractReply, stripThinking } from "../server/lib/upstream.mjs";
import { createLogger } from "../server/lib/logger.mjs";
import { loadPersistedState, savePersistedState } from "../server/lib/state.mjs";

const CONFIG = {
  apiBase: "https://api.example.test/v1",
  apiKey: "test-key-not-real",
  model: "M2-her",
  maxTokens: 200,
  temperature: 0.7,
  upstreamTimeoutMs: 50,
};

const HISTORY = [
  { role: "user", content: "今天训练有什么安排" },
  { role: "assistant", content: "先把基础走一遍，急什么。" },
];

/** 造一个 fetch stub。`respond` 收到 (url, init)，返回 Response。 */
function stubFetch(respond) {
  return vi.fn(async (url, init) => respond(url, init));
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("上游请求组装（闸3）", () => {
  it("system 永远排在第一条，且只由服务端给出", () => {
    const payload = buildUpstreamPayload(CONFIG, "你是叶修。", HISTORY);
    expect(payload.messages[0]).toEqual({ role: "system", content: "你是叶修。" });
    expect(payload.messages.slice(1)).toEqual(HISTORY);
  });

  it("model / temperature / 长度上限一律取服务端配置，客户端影响不到", () => {
    const payload = buildUpstreamPayload(CONFIG, "s", HISTORY);
    expect(payload.model).toBe("M2-her");
    expect(payload.temperature).toBe(0.7);
    // 两个长度字段都发 —— 其中一个被上游静默忽略时，另一个仍然生效。
    expect(payload.max_tokens).toBe(200);
    expect(payload.max_completion_tokens).toBe(200);
    expect(payload.stream).toBe(false);
  });

  it("不携带任何客户端可控的额外字段", () => {
    const payload = buildUpstreamPayload(CONFIG, "s", HISTORY);
    expect(Object.keys(payload).sort()).toEqual(
      ["max_completion_tokens", "max_tokens", "messages", "model", "stream", "temperature"].sort(),
    );
  });
});

describe("上游响应解析", () => {
  it("正常取回复；剥掉思考块；数组形态的 content 也能拼出来", () => {
    expect(extractReply({ choices: [{ message: { content: "  嗯，来得正好。 " } }] })).toEqual({
      reply: "嗯，来得正好。",
      truncated: false,
    });
    expect(extractReply({ choices: [{ message: { content: [{ type: "text", text: "前半" }, { type: "image_url" }, { type: "text", text: "后半" }] } }] })?.reply).toBe("前半后半");
    expect(stripThinking("<thinking>先想想</thinking>练基础吧")).toBe("练基础吧");
    expect(stripThinking("<think>内部的</think>练基础吧")).toBe("练基础吧");
  });

  it("finish_reason=length 标成 truncated（用于日志，不改响应结构）", () => {
    expect(extractReply({ choices: [{ message: { content: "被截断的话" }, finish_reason: "length" }] })?.truncated).toBe(true);
  });

  // 2026-09-24 线上实测：尾注写了「不使用括号」，10 次里仍有 6 次带括号
  // （更严的尾注只降到 5/10）。提示词压不住，所以出口必须做确定性剥离。
  it("剥掉括号动作描写 —— 这是提示词压不住、只能由出口兜住的行为", () => {
    const cases = [
      // [原始, 期望]
      ["（叼着烟，敲击键盘）看战术录像带呢。", "看战术录像带呢。"],
      ["（专注地盯着屏幕）还差点", "还差点"],
      ["我的故事？哪段？（弹了弹烟灰，转头看向电脑屏幕）说到哪算哪吧。", "我的故事？哪段？说到哪算哪吧。"],
      ["(半角括号也要处理) 嗯，行吧。", "嗯，行吧。"],
      ["（叼着烟）说真的（拍了拍你的肩），别硬撑。", "说真的，别硬撑。"],
      // 不含括号的必须逐字不变 —— 这是"不误伤"的反向断言
      ["多了去了，周泽楷、刘皓、包子、罗辑、唐柔……你得说哪个", "多了去了，周泽楷、刘皓、包子、罗辑、唐柔……你得说哪个"],
      ["还好啊，就那样呗。怎么，你是有什么事想找我聊吗？", "还好啊，就那样呗。怎么，你是有什么事想找我聊吗？"],
    ];
    for (const [input, expected] of cases) {
      expect(extractReply({ choices: [{ message: { content: input } }] })?.reply, input).toBe(expected);
    }
  });

  it("剥完为空 → 判为结构不对（不把空串当有效回复送到前端）", () => {
    expect(extractReply({ choices: [{ message: { content: "（只是站着，没说话）" } }] })).toBeNull();
  });

  it("不误伤【】与 **，那两类偶尔是角色刻意的强调", () => {
    const kept = "【任务进度】还差一点。";
    expect(extractReply({ choices: [{ message: { content: kept } }] })?.reply).toBe(kept);
  });

  it("跨行的括号不剥（未闭合时若强行剥会把整段正文吃掉）", () => {
    const raw = "（这一行没有闭合的括号\n后面的正文必须保留。";
    expect(extractReply({ choices: [{ message: { content: raw } }] })?.reply).toBe(raw);
  });

  it("结构不对一律返回 null，而不是抛异常或返回空串", () => {
    for (const bad of [
      null,
      42,
      "text",
      {},
      { choices: [] },
      { choices: [{ message: {} }] },
      { choices: [{ message: { content: null } }] },
      { choices: [{ message: { content: "   " } }] },
      { choices: [{ message: { content: "<thinking>只有思考</thinking>" } }] },
    ]) {
      expect(extractReply(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("上游调用的失败分支（不泄露、不悬挂）", () => {
  it("成功路径：带 Authorization，打到 base + /chat/completions", async () => {
    const fetchImpl = stubFetch(() => jsonResponse({ choices: [{ message: { content: "练基础吧。" } }] }));
    const res = await callUpstream(CONFIG, "你是叶修。", HISTORY, fetchImpl);
    expect(res.ok).toBe(true);
    expect(res.reply).toBe("练基础吧。");

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer test-key-not-real");
  });

  it("上游非 2xx：只留状态码，**不带任何上游正文**", async () => {
    const fetchImpl = stubFetch(
      () => new Response("invalid api key sk-live-abc123, account suspended", { status: 401 }),
    );
    const res = await callUpstream(CONFIG, "s", HISTORY, fetchImpl);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("upstream_http_401");
    const dump = JSON.stringify(res);
    expect(dump).not.toContain("sk-live");
    expect(dump).not.toContain("suspended");
  });

  it("上游返回非 JSON → upstream_not_json（不是 502 之外的模糊错误）", async () => {
    const fetchImpl = stubFetch(() => new Response("<html>bad gateway</html>", { status: 200 }));
    const res = await callUpstream(CONFIG, "s", HISTORY, fetchImpl);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("upstream_not_json");
  });

  it("上游 JSON 结构不符 → upstream_shape", async () => {
    const fetchImpl = stubFetch(() => jsonResponse({ error: { message: "quota exceeded" } }));
    const res = await callUpstream(CONFIG, "s", HISTORY, fetchImpl);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("upstream_shape");
    expect(JSON.stringify(res)).not.toContain("quota exceeded");
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
    const res = await callUpstream(CONFIG, "s", HISTORY, fetchImpl);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("upstream_timeout");
  });

  it("网络异常 → upstream_network", async () => {
    const fetchImpl = stubFetch(() => {
      throw new Error("ECONNREFUSED 10.0.0.9:443");
    });
    const res = await callUpstream(CONFIG, "s", HISTORY, fetchImpl);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("upstream_network");
    expect(JSON.stringify(res)).not.toContain("ECONNREFUSED");
  });
});

describe("persona 组装", () => {
  it("顺序是 universal + baseline + 固定尾注，尾注永远在最后", () => {
    const system = buildSystem({ universalPrompt: "你是叶修。", storyBaseline: "当前主线……" });
    expect(system.startsWith("你是叶修。")).toBe(true);
    expect(system).toContain("当前主线");
    expect(system.endsWith(TRAILING_NOTE)).toBe(true);
    expect(system.indexOf("当前主线")).toBeLessThan(system.indexOf(TRAILING_NOTE));
  });

  it("缺字段不炸，也不会拼出多余空行", () => {
    expect(buildSystem({})).toBe(TRAILING_NOTE);
    expect(buildSystem({ universalPrompt: " 只有这一段 " })).toBe(`只有这一段\n\n${TRAILING_NOTE}`);
    const withGap = buildSystem({ universalPrompt: "a", storyBaseline: "   " });
    expect(withGap).toBe(`a\n\n${TRAILING_NOTE}`);
  });

  it("makeCharKeyChecker 只认表里有的 key", () => {
    const check = makeCharKeyChecker(new Map([["ye-xiu", {}]]));
    expect(check("ye-xiu")).toBe(true);
    expect(check("qin-che")).toBe(false);
    expect(check("")).toBe(false);
  });

  it("服务端角色表与前端 chat-keys.ts 逐条一致（两处各写一份是已知风险）", () => {
    // 前端那份是 TS、这里是 mjs，编译期没法互相引用 —— 但口径必须一致，
    // 否则会出现"界面上有入口、服务端 400"或反之，而且都不会报错。
    const source = readFileSync(new URL("../src/lib/chat-keys.ts", import.meta.url), "utf8");
    const pairs = [...source.matchAll(/name:\s*"([^"]+)",\s*key:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]);
    expect(pairs.length).toBeGreaterThan(0);
    expect(Object.fromEntries(pairs)).toEqual(CHAR_KEY_BY_NAME);
  });
});

describe("日志隐私", () => {
  it("请求日志只有约定的字段，绝不出现正文或原始 IP", () => {
    const lines = [];
    const log = createLogger((line) => lines.push(line));
    log.request({
      ipHash: "a1b2c3d4e5f60718",
      charKey: "ye-xiu",
      turns: 4,
      status: 200,
      degradedReason: null,
      durationMs: 812,
    });

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(Object.keys(parsed).sort()).toEqual(
      ["charKey", "degradedReason", "durationMs", "ipHash", "kind", "status", "ts", "turns"].sort(),
    );
    expect(parsed.ipHash).toBe("a1b2c3d4e5f60718");
  });

  it("alert 只接受固定 code，没有塞自由文本的入口", () => {
    const lines = [];
    const log = createLogger((line) => lines.push(line));
    log.alert("circuit_open", { sessions: 150 });
    const parsed = JSON.parse(lines[0]);
    expect(parsed.code).toBe("circuit_open");
    expect(parsed.kind).toBe("alert");
  });

  it("跑一遍完整流程后扫描全部日志行：没有对话正文、没有原始 IP", () => {
    const lines = [];
    const log = createLogger((line) => lines.push(line));
    const secret = "我今天说了什么不该被记下来的话";
    const rawIp = "203.0.113.7";

    log.request({ ipHash: "aaaaaaaaaaaaaaaa", charKey: "ye-xiu", turns: 2, status: 200, durationMs: 100 });
    log.request({ ipHash: "aaaaaaaaaaaaaaaa", charKey: "ye-xiu", turns: 2, status: 429, degradedReason: "ip_rate", durationMs: 3 });
    log.alert("upstream_failed", { reason: "upstream_timeout", status: 0 });

    const all = lines.join("\n");
    expect(all).not.toContain(secret);
    expect(all).not.toContain(rawIp);
  });
});

describe("熔断计数持久化", () => {
  it("写进去再读出来是同一条记录", () => {
    const dir = mkdtempSync(join(tmpdir(), "chat-state-"));
    expect(savePersistedState(dir, { day: "2026-09-23", sessions: 42 }).ok).toBe(true);
    expect(loadPersistedState(dir)).toEqual({ day: "2026-09-23", sessions: 42 });
  });

  it("目录不存在时会先建出来（卷挂载点首次启动的常见情形）", () => {
    const dir = mkdtempSync(join(tmpdir(), "chat-state-"));
    const nested = join(dir, "state", "deeper");
    expect(savePersistedState(nested, { day: "2026-09-23", sessions: 1 }).ok).toBe(true);
    expect(loadPersistedState(nested).sessions).toBe(1);
  });

  it("文件缺失 / 损坏 / 结构不对都退化成全新开始，而不是抛错", () => {
    const dir = mkdtempSync(join(tmpdir(), "chat-state-"));
    expect(loadPersistedState(dir)).toEqual({ day: "", sessions: 0 });

    for (const junk of ["", "{", "null", "[]", '{"day":1,"sessions":2}', '{"day":"2026-09-23","sessions":-5}', '{"sessions":3}']) {
      writeFileSync(join(dir, "state.json"), junk, "utf8");
      expect(loadPersistedState(dir), junk).toEqual({ day: "", sessions: 0 });
    }
  });

  it("写入失败返回 ok:false 而不抛错（磁盘问题不该让对话功能整个挂掉）", () => {
    // 用一个**文件**当目录 → mkdir 必然失败。
    const dir = mkdtempSync(join(tmpdir(), "chat-state-"));
    const asFile = join(dir, "not-a-dir");
    writeFileSync(asFile, "x", "utf8");
    const res = savePersistedState(join(asFile, "state"), { day: "2026-09-23", sessions: 1 });
    expect(res.ok).toBe(false);
    expect(typeof res.error).toBe("string");
  });

  it("落盘的是纯 ASCII JSON，不含任何用户内容", () => {
    const dir = mkdtempSync(join(tmpdir(), "chat-state-"));
    savePersistedState(dir, { day: "2026-09-23", sessions: 7 });
    const raw = readFileSync(join(dir, "state.json"), "utf8");
    expect(JSON.parse(raw)).toEqual({ day: "2026-09-23", sessions: 7 });
    expect(raw).toMatch(/^\{"day":"\d{4}-\d{2}-\d{2}","sessions":\d+\}$/);
  });
});
