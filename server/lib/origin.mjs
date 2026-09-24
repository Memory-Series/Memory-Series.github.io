// @ts-check
/**
 * 闸 6：出口 `Origin` 白名单。
 *
 * 它挡的不是"跨站攻击"（同源策略已经在挡），而是**接口被别处当免费网关用**：
 * 页面被嵌到别人站里、或有人写个脚本从自己的域名调过来。配合"服务端只认 charKey"
 * 一起，构成"这个接口只服务于本站页面"的完整约束。
 *
 * 没有 `Origin` 一律拒绝：浏览器发起的同源 POST **一定**带 `Origin`
 * （Fetch 规范如此），所以"没有 Origin"只可能是脚本或非浏览器客户端。
 */

/**
 * 严格全等匹配。**不做前缀/通配** —— 白名单一旦支持通配，
 * `https://www.traceinhabit.cn.evil.com` 这类域名就会因为"前缀相同"而通过。
 *
 * @param {string | string[] | undefined} origin
 * @param {string[]} allowed
 * @returns {boolean}
 */
export function isOriginAllowed(origin, allowed) {
  const value = Array.isArray(origin) ? origin[0] : origin;
  if (typeof value !== "string" || value.trim() === "") return false;
  const norm = value.trim().replace(/\/+$/, "");
  return allowed.some((a) => a.replace(/\/+$/, "") === norm);
}
