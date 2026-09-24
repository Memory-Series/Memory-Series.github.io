// @ts-check
/**
 * 熔断计数的持久化。
 *
 * 为什么必须落盘：日熔断（150 会话 ≈ ¥12）是**成本保护**。只放内存的话，
 * 一次容器重启就归零，而"重启"是个谁都能触发的动作（`docker restart`、
 * 甚至宿主机 OOM），于是成本上限变成"每次重启后重新开始"—— 保护失效。
 *
 * 只持久化**全局**计数。同 IP 的窗口/日计数留在内存：那部分重启丢失是可接受的
 * （攻击者需要重启服务器才能绕过，而拿到服务器权限的人不缺别的手段），
 * 换来的是「不用为每个陌生 IP 都写一次盘」—— 否则用海量 IP 打过来，
 * 每个 IP 都往 state.json 里塞一行，文件会无界膨胀。
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * @typedef {object} PersistedState 全局日计数
 * @property {string} day      `YYYY-MM-DD`
 * @property {number} sessions 当日成功的会话数
 */

/**
 * 读。**任何异常都退化成"全新开始"而不是抛错** —— 磁盘坏了、文件被截断、
 * 目录还没建，都不该让对话功能整个站起来不了。宁可少一层保护也要能用，
 * 且这种情况会由调用方记一行告警，不会静默。
 *
 * @param {string} dir
 * @returns {PersistedState}
 */
export function loadPersistedState(dir) {
  try {
    const parsed = JSON.parse(readFileSync(join(dir, "state.json"), "utf8"));
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.day === "string" &&
      Number.isFinite(parsed.sessions) &&
      parsed.sessions >= 0
    ) {
      return { day: parsed.day, sessions: Math.floor(parsed.sessions) };
    }
    return { day: "", sessions: 0 };
  } catch {
    return { day: "", sessions: 0 };
  }
}

/**
 * 原子写：先落 `state.json.tmp`，再 `rename`。
 *
 * 直接覆写原文件的话，容器在写到一半时被 kill 会留下半个 JSON；
 * 而上面 `loadPersistedState` 对损坏文件的策略是"当成 0"—— 等于熔断静默失效。
 * `rename` 在同一文件系统上是原子的，要么旧内容、要么新内容，不会出现中间态。
 *
 * @param {string} dir
 * @param {PersistedState} state
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function savePersistedState(dir, state) {
  try {
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, "state.json.tmp");
    writeFileSync(tmp, JSON.stringify(state), "utf8");
    renameSync(tmp, join(dir, "state.json"));
    return { ok: true };
  } catch (err) {
    // 写不进去不是致命错误：熔断退化为"内存计数"（重启才归零），
    // 总比整个服务挂掉强。调用方负责把这条记成告警。
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
