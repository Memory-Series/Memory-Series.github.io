// @ts-check
/**
 * 闸 4（同 IP 限额）+ 闸 5（全局日熔断）。
 *
 * 判定逻辑**全是纯函数**（接收记录对象、返回"放行/拒绝 + 新记录"），
 * 内存表与磁盘只在这一层的 IO 包装里碰。这样限额的边界值能被精确测试
 * （第 15 次 vs 第 16 次、跨窗口重置、跨天重置），也把"被拒绝的请求不计入"
 * 这类容易写错的细节摆到测试面前。
 *
 * 两种计数的口径**故意不同**：
 *   - IP 计数：**每次通过校验的请求**都算（含上游失败的）。它防的是"刷接口"。
 *   - 全局熔断：只算**上游成功**的会话。它管的是钱 —— 失败的请求没产生上游成本。
 * 把两者混成一个计数器会导致"上游挂掉时用户被误伤"或"失败请求也烧额度统计"。
 */
import { createHash } from "node:crypto";

/**
 * @typedef {object} IpRecord
 * @property {number} windowStart  当前固定窗口的起点（ms）
 * @property {number} windowCount  本窗口内已用次数
 * @property {string} day          上次计数的日期（本地日，`YYYY-MM-DD`）
 * @property {number} dayCount     当日已用次数
 */

/** @returns {IpRecord} */
export function freshIpRecord() {
  return { windowStart: 0, windowCount: 0, day: "", dayCount: 0 };
}

/**
 * 取本地日字符串。用本地时区而不是 UTC —— 限额是给人看的运营概念，
 * 跟服务器所在时区对齐才有意义（跨时区漂移会让"今天还剩多少"对不上）。
 *
 * @param {number} nowMs
 * @returns {string}
 */
export function dayKey(nowMs) {
  const d = new Date(nowMs);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * 固定窗口 + 日上限的联合判定。
 *
 * 被拒绝时**不推进任何计数** —— 否则一次密集的拒绝会把窗口一直顶在满格，
 * 用户等满一个窗口也恢复不了（"拒绝还在累加"是最常见的限额实现 bug）。
 *
 * @param {IpRecord | undefined} record 首次见到这个 IP 时是 undefined，按全新记录处理
 * @param {number} nowMs
 * @param {{ windowMax: number, windowSec: number, dailyMax: number }} opts
 * @returns {{ allowed: boolean, reason: "ip_rate" | "ip_daily" | null, next: IpRecord, windowCount: number, dayCount: number }}
 */
export function checkIpLimit(record, nowMs, opts) {
  const current = record ?? freshIpRecord();
  const day = dayKey(nowMs);

  const windowAlive = current.windowStart > 0 && nowMs - current.windowStart < opts.windowSec * 1000;
  const windowStart = windowAlive ? current.windowStart : nowMs;
  const windowCount = windowAlive ? current.windowCount : 0;
  const dayCount = current.day === day ? current.dayCount : 0;

  if (windowAlive && windowCount >= opts.windowMax) {
    return {
      allowed: false,
      reason: "ip_rate",
      next: { windowStart, windowCount, day, dayCount },
      windowCount,
      dayCount,
    };
  }

  if (dayCount >= opts.dailyMax) {
    return {
      allowed: false,
      reason: "ip_daily",
      next: { windowStart, windowCount, day, dayCount },
      windowCount,
      dayCount,
    };
  }

  return {
    allowed: true,
    reason: null,
    next: { windowStart, windowCount: windowCount + 1, day, dayCount: dayCount + 1 },
    windowCount: windowCount + 1,
    dayCount: dayCount + 1,
  };
}

/**
 * @typedef {object} GlobalRecord
 * @property {string} day
 * @property {number} sessions
 */

/**
 * 全局日熔断的**只读**判定。递增由 `recordGlobalSession` 单独做 ——
 * 因为"一次会话"的定义是**上游成功**，不能在收到请求时就先记一笔。
 *
 * @param {GlobalRecord} record
 * @param {number} nowMs
 * @param {number} max
 * @returns {{ allowed: boolean, sessions: number }}
 */
export function checkGlobalLimit(record, nowMs, max) {
  const day = dayKey(nowMs);
  const sessions = record && record.day === day ? record.sessions : 0;
  return { allowed: sessions < max, sessions };
}

/**
 * 上游成功后记一次会话。跨天自动归零。
 *
 * @param {GlobalRecord} record
 * @param {number} nowMs
 * @returns {GlobalRecord}
 */
export function recordGlobalSession(record, nowMs) {
  const day = dayKey(nowMs);
  const sessions = record && record.day === day ? record.sessions : 0;
  return { day, sessions: sessions + 1 };
}

/**
 * IP → 哈希。**只存哈希，不存原文**；加盐是为了挡住"已知 IP 段反查"——
 * 不加盐的话，2^32 个 IPv4 全枚举一遍就能把哈希表还原成 IP 列表。
 *
 * 取前 16 个 hex 字符（64 bit）：碰撞概率在这个量级（每天几百个 IP）可以忽略，
 * 同时短到不会在日志里显得可疑。
 *
 * @param {string} ip
 * @param {string} salt
 * @returns {string}
 */
export function hashIp(ip, salt) {
  if (!ip) return "unknown";
  return createHash("sha256").update(`${ip}|${salt}`).digest("hex").slice(0, 16);
}

/**
 * 从请求头与 socket 取客户端 IP。
 *
 * **取最右段，不是最左段。** `X-Forwarded-For` 的左侧由客户端完全可控
 * （curl 随便加一个就伪造了），只有右侧才是链路上最后一级代理真实看到的地址。
 * 如果取最左段，攻击者每次请求换一个假 IP，所有 IP 限额直接失效。
 *
 * 配套要求：nginx 侧必须用 `proxy_set_header X-Forwarded-For $remote_addr;`
 * （**覆盖**写入，不是 `$proxy_add_x_forwarded_for` 追加）。
 * 两层一致，无论 nginx 用的是覆盖还是追加，这里取最右段都拿到可信值。
 *
 * @param {string | string[] | undefined} forwardedFor
 * @param {string | undefined} socketAddress
 * @returns {string}
 */
export function clientIp(forwardedFor, socketAddress) {
  const raw = Array.isArray(forwardedFor) ? forwardedFor.join(",") : forwardedFor;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return socketAddress || "unknown";
}
