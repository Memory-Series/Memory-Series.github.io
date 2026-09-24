// @ts-check
/**
 * 隐私日志（设计文档 §10.2 第 7 条：服务端不留存正文）。
 *
 * 允许写进日志的**只有**：时间、IP 哈希、charKey、轮数、状态码、降级原因、用时、
 * 以及一条内容不敏感的告警文本。
 *
 * 绝不能进日志的：对话正文、原始 IP、上游原始响应/错误文本、请求体原文。
 *
 * `write` 做成可注入的，是为了让"日志里查不到正文与原始 IP"这条验收
 * 能变成一条**断言**而不是一次人工目检 —— 测试注入一个收集器，
 * 跑完整流程后扫描收集到的每一行。
 */

/**
 * @typedef {object} RequestLogEntry
 * @property {string} ipHash
 * @property {string | null} [charKey]        拒绝路径上还没有 charKey，写 null 而不是省略 ——
 *                                            字段集合固定，日志解析器就不用处理"这个键有时在有时不在"
 * @property {number} [turns]
 * @property {number} status
 * @property {string | null} [degradedReason] 成功且未被截断时是 null
 * @property {number} durationMs
 */

/**
 * @param {(line: string) => void} [write]
 * @param {() => number} [now]
 */
export function createLogger(write = (line) => process.stdout.write(line + "\n"), now = Date.now) {
  /**
   * @param {Record<string, unknown>} entry
   */
  function emit(entry) {
    write(JSON.stringify({ ts: new Date(now()).toISOString(), ...entry }));
  }

  return {
    /** 每请求一行。字段集合固定，多一个都要先问"它会不会泄露内容"。 */
    /**
     * @param {RequestLogEntry} entry
     */
    request(entry) {
      emit({
        kind: "chat",
        ipHash: entry.ipHash,
        charKey: entry.charKey ?? null,
        turns: entry.turns ?? 0,
        status: entry.status,
        degradedReason: entry.degradedReason ?? null,
        durationMs: entry.durationMs,
      });
    },
    /**
     * 运维告警。**只允许写固定的、与内容无关的文本** —— 这个函数没有接收自由文本
     * 的入口是有意的：一旦允许传字符串，早晚会有人把上游报错塞进来。
     * @param {string} code
     * @param {Record<string, unknown>} [extra]
     */
    alert(code, extra = {}) {
      emit({ kind: "alert", code, ...extra });
    },
  };
}
