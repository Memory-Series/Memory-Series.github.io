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

/**
 * chat-003 —— TTS 的日计数（**单独一个文件** `tts-state.json`）。
 *
 * 为什么不与对话共用一个 `state.json`：两个计数器服务两条**互相独立**的链路
 * （一个管 token，一个管字符）。写在一起，TTS 侧的写入就有机会影响对话侧熔断的
 * 读取 —— 而 `chat-002` 的熔断行为已经被验收过，不该为一条新链路承担一次改数据的
 * 风险。挂载点不变（还是 `/app/state` 那个卷），运维视角仍然是"一个目录"。
 *
 * @typedef {object} TtsPersistedState
 * @property {string} day
 * @property {number} requests    当日成功合成的**次数**（全局熔断判定用）
 * @property {number} characters  当日计费**字符数**累计（仅用于对账，**不参与拒绝判定**）
 */

/**
 * 非负整数归一化。除了 `Number.isFinite` 还挡掉负值与小数 ——
 * 计数被写成 `-1` 或 `3.7` 时宁可归零，也不要让熔断算出一个奇怪的阈值。
 *
 * @param {unknown} value
 * @returns {number}
 */
function toCount(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** @returns {TtsPersistedState} */
export function emptyTtsState() {
  return { day: "", requests: 0, characters: 0 };
}

/**
 * 读。与 `loadPersistedState` 同策略：磁盘坏了、文件被截断、目录还没建，
 * 一律退化成"全新开始"而不是抛错，调用方负责记一行告警。
 *
 * @param {string} dir
 * @returns {TtsPersistedState}
 */
export function loadTtsState(dir) {
  try {
    const parsed = JSON.parse(readFileSync(join(dir, "tts-state.json"), "utf8"));
    if (parsed && typeof parsed === "object" && typeof parsed.day === "string") {
      return { day: parsed.day, requests: toCount(parsed.requests), characters: toCount(parsed.characters) };
    }
    return emptyTtsState();
  } catch {
    return emptyTtsState();
  }
}

/**
 * 原子写：先落 `tts-state.json.tmp`，再 `rename`。
 *
 * 显式逐字段重建对象（而不是 `JSON.stringify(state)`）—— 这份文件是"只含计数"的
 * 承诺，多一个键都该在写之前被看见；将来若有人往内存对象上挂了个字段，
 * 这里不会顺手把它落盘。
 *
 * @param {string} dir
 * @param {TtsPersistedState} state
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function saveTtsState(dir, state) {
  try {
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, "tts-state.json.tmp");
    writeFileSync(
      tmp,
      JSON.stringify({ day: state.day, requests: state.requests, characters: state.characters }),
      "utf8",
    );
    renameSync(tmp, join(dir, "tts-state.json"));
    return { ok: true };
  } catch (err) {
    // 与对话侧同口径：写不进去退化为"内存计数"（重启才归零），总比整个服务挂掉强。
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
